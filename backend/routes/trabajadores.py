from datetime import date, datetime
from typing import List
from uuid import UUID
import os

from fastapi import APIRouter, Depends, File, HTTPException, Request, status, UploadFile
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import joinedload, Session

from core.archivos import CARPETA_FOTOS_TRABAJADORES
from core.auditoria import registrar_auditoria
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    AlcancePermisoEnum,
    TipoPermisoEnum,
    TipoRolEnum,
)
from core.security import (
    get_db_with_advanced_security,
    verificar_permisos_requeridos,
)
from models.contratos import Contratos
from models.trabajadores import Trabajadores
from models.roles import Roles
from models.usuarios import Usuarios
from models.usuarios_empresas import UsuariosEmpresas
from schemas.empresas import EmpresaSimpleResponse
from schemas.trabajadores import (
    TrabajadorAutogestionUpdate,
    TrabajadorCreate,
    TrabajadorResponse,
    TrabajadorUpdate,
)

# APIRouter agrupa todos los endpoints relacionados con la gestión de trabajadores bajo el prefijo "/api/trabajadores".
router = APIRouter(prefix="/api/trabajadores", tags=["Trabajadores"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)


@router.get(
    "/me",
    response_model=TrabajadorResponse,
    summary="Obtener mi ficha de trabajador",
    description="Obtiene la ficha laboral vinculada a la cuenta autenticada.",
)
@limiter.limit("30/minute")
def obtener_mi_ficha_trabajador(
    request: Request,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([
        AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.TRABAJADORES + "-" + AlcancePermisoEnum.PROPIO
    ])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /api/trabajadores/me**

    Obtiene la ficha laboral vinculada a la cuenta autenticada.
    """
    trabajador = (
        db.query(Trabajadores)
        .options(joinedload(Trabajadores.empresa))
        .filter(
            Trabajadores.usuario_id == usuario_actual.id,
            Trabajadores.empresa_id == request.headers.get("Empresa-ID"),
        )
        .first()
    )
    if trabajador is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró una ficha de trabajador vinculada a la cuenta.",
        )
    return trabajador


@router.get(
    "/empresa/{id_empresa}",
    response_model=List[TrabajadorResponse],
    summary="Obtener trabajadores por empresa",
    description="Obtiene los trabajadores de una empresa.",
)
@limiter.limit("60/minute")
def obtener_trabajadores_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/trabajadores/empresa/{id_empresa}**

    Obtiene los trabajadores de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de trabajadores de la empresa ({id_empresa}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    trabajadores = (
        db.query(Trabajadores).options(
            joinedload(Trabajadores.empresa),
        )
        .filter(Trabajadores.empresa_id == id_empresa, Trabajadores.activo.is_(True))
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'trabajadores',
            'accion': 'consultar_empresa',
        },
        trabajador_id=None,
    )
    db.commit()

    return trabajadores


@router.get(
    "/{id_trabajador}/empresa",
    response_model=EmpresaSimpleResponse,
    summary="Obtener empresa del trabajador",
    description="Obtiene la empresa vinculada al expediente del trabajador.",
)
@limiter.limit("60/minute")
def obtener_empresa_trabajador(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.TRABAJADORES + "-" + AlcancePermisoEnum.PROPIO])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/trabajadores/{id_trabajador}/empresa**

    Obtiene la empresa vinculada al expediente del trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de empresa del trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    trabajador = (
        db.query(Trabajadores).options(
            joinedload(Trabajadores.empresa),
        )
        .filter(Trabajadores.id == id_trabajador)
        .first()
    )

    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado en el sistema."
        )

    if (
        getattr(request.state, "alcance_efectivo", None) == AlcancePermisoEnum.PROPIO.value
        and trabajador.usuario_id != usuario_actual.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trabajador no encontrado.",
        )

    if not trabajador.empresa:
        print(f"El trabajador no tiene una empresa asociada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El trabajador no tiene una empresa asociada."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'trabajadores',
            'accion': 'consultar_empresa',
        },
        trabajador_id=id_trabajador,
    )
    db.commit()

    return trabajador.empresa

@router.get(
    "/{id_trabajador}",
    response_model=TrabajadorResponse,
    summary="Obtener trabajador por id",
    description="Obtiene un trabajador por su id.",
)
@limiter.limit("60/minute")
def obtener_trabajador_id(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.TRABAJADORES + "-" + AlcancePermisoEnum.PROPIO])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/trabajadores/{id_trabajador}**

    Obtiene un trabajador por su id.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta del trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    trabajador = (
        db.query(Trabajadores).options(
            joinedload(Trabajadores.empresa),
        )
        .filter(Trabajadores.id == id_trabajador)
        .first()
    )

    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado en el sistema."
        )

    if (
        getattr(request.state, "alcance_efectivo", None) == AlcancePermisoEnum.PROPIO.value
        and trabajador.usuario_id != usuario_actual.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trabajador no encontrado.",
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'trabajadores',
            'accion': 'consultar_id',
        },
        trabajador_id=id_trabajador,
    )
    db.commit()

    return trabajador

@router.post(
    "",
    response_model=TrabajadorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear trabajador",
    description="Crea un expediente laboral de trabajador.",
)
@limiter.limit("15/minute")
def crear_trabajador(
    request: Request,
    payload: TrabajadorCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/trabajadores**

    Crea un expediente laboral de trabajador.
    """
    # Registrar metadatos de red y auditoría de la creación
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de trabajador desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    identidad_existente = db.query(Trabajadores).filter(
        Trabajadores.empresa_id == payload.empresa_id,
        Trabajadores.dni_nif_nie == payload.dni_nif_nie
    ).first()

    if identidad_existente:
        print("Ya existe un trabajador registrado con este DNI/NIF/NIE dentro de la misma empresa.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un trabajador registrado con este DNI/NIF/NIE dentro de la misma empresa."
        )

    if payload.usuario_id is not None:
        usuario_vinculado = db.query(Usuarios).filter(
            Usuarios.id == payload.usuario_id,
            Usuarios.activo.is_(True),
        ).first()
        if usuario_vinculado is None:
            print(f"Usuario ({payload.usuario_id}) no encontrado.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un usuario activo con ese identificador.",
            )
        trabajador_vinculado = db.query(Trabajadores.id).filter(
            Trabajadores.usuario_id == payload.usuario_id,
            Trabajadores.empresa_id == payload.empresa_id,
        ).first()
        if trabajador_vinculado is not None:
            print(f"El usuario ({payload.usuario_id}) ya está vinculado a un trabajador de la empresa ({payload.empresa_id}).")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El usuario ya está vinculado a un trabajador de esta empresa.",
            )

        membresia_trabajador = (
            db.query(UsuariosEmpresas.id)
            .join(Roles, Roles.id == UsuariosEmpresas.rol_id)
            .filter(
                UsuariosEmpresas.usuario_id == payload.usuario_id,
                UsuariosEmpresas.empresa_id == payload.empresa_id,
                UsuariosEmpresas.activo.is_(True),
                Roles.tipo == TipoRolEnum.TRABAJADOR,
            )
            .first()
        )
        if membresia_trabajador is None:
            print(f"El usuario ({payload.usuario_id}) no tiene una membresía de trabajador activa en la empresa.")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El usuario no tiene una membresía de trabajador activa en la empresa.",
            )

    nuevo_trabajador = Trabajadores(
        empresa_id=payload.empresa_id,
        dni_nif_nie=payload.dni_nif_nie,
        nombre=payload.nombre,
        apellidos=payload.apellidos,
        numero_seguridad_social=payload.numero_seguridad_social,
        fecha_nacimiento=payload.fecha_nacimiento,
        usuario_id=payload.usuario_id,
    )

    try:
        db.add(nuevo_trabajador)
        db.flush()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=payload.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': 'trabajadores',
                'accion': 'crear',
            },
            trabajador_id=nuevo_trabajador.id,
        )

        db.commit()

        trabajador_con_relacion = (
            db.query(Trabajadores).options(
                joinedload(Trabajadores.empresa),
            )
            .filter(Trabajadores.id == nuevo_trabajador.id)
            .first()
        )

        return trabajador_con_relacion
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear el trabajador en la empresa: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido crear el trabajador en la empresa.'
        )

@router.post(
    "/{id_trabajador}/baja",
    status_code=status.HTTP_200_OK,
    summary="Baja de un trabajador",
    description="Tramita la baja completa de un trabajador y de sus relaciones activas.",
)
@limiter.limit("10/minute")
def baja_trabajador(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/trabajadores/{id_trabajador}/baja-total**

    Tramita la baja completa de un trabajador y de sus relaciones activas.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de baja del trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Trabajador no encontrado."
        )

    try:
        fecha_actual = date.today()

        setattr(trabajador, "activo", False)
        setattr(trabajador, "fecha_baja_empresa", fecha_actual)

        contratos_activos = db.query(Contratos).filter(
            Contratos.trabajador_id == id_trabajador,
            Contratos.activo.is_(True)
        ).all()
        for contrato in contratos_activos:
            setattr(contrato, 'activo', False)
            setattr(contrato, 'fecha_fin', fecha_actual)

        usuario_asociado = (
            db.query(Usuarios)
            .filter(Usuarios.id == trabajador.usuario_id)
            .first()
            if trabajador.usuario_id is not None
            else None
        )
        if usuario_asociado:
            setattr(usuario_asociado, 'activo', False)

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': 'trabajadores',
                'accion': 'baja',
            },
            trabajador_id=trabajador.id,
        )

        db.commit()

        print(f"Baja procesada correctamente para el trabajador {id_trabajador}.")
        return {"detail": f"Baja procesada correctamente para el trabajador."}

    except Exception as e:
        db.rollback()
        print(f"No se ha podido tramitar la baja del trabajador: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='No se ha podido tramitar la baja. Se ha revertido la operación.',
        )
@router.put(
    "/{id_trabajador}/foto",
    response_model=TrabajadorResponse,
    summary="Modificar foto de trabajador",
    description="Modifica la fotografía de perfil de un trabajador.",
)
@limiter.limit("20/minute")
async def modificar_foto_trabajador(
    request: Request,
    id_trabajador: UUID,
    file: UploadFile = File(...),
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PUT /api/trabajadores/{id_trabajador}/foto**

    Modifica la fotografía de perfil de un trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de la foto de perfil para el trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Trabajador no encontrado."
        )

    contenido = await file.read(5_000_001)
    if len(contenido) > 5_000_000:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="La imagen supera el tama?o m?ximo de 5 MB.")
    extensiones = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    extension = extensiones.get(file.content_type or "")
    firma_valida = (
        (extension == "jpg" and contenido.startswith(b"\xff\xd8\xff"))
        or (extension == "png" and contenido.startswith(b"\x89PNG\r\n\x1a\n"))
        or (extension == "webp" and len(contenido) >= 12 and contenido[:4] == b"RIFF" and contenido[8:12] == b"WEBP")
    )
    if not extension or not firma_valida:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo no es una imagen JPEG, PNG o WEBP v?lida.")

    os.makedirs(CARPETA_FOTOS_TRABAJADORES, exist_ok=True)
    nombre_archivo = f"trabajador_{id_trabajador}.{extension}"
    ruta_destino = CARPETA_FOTOS_TRABAJADORES / nombre_archivo
    try:
        ruta_destino.write_bytes(contenido)
    except OSError as e:
        print(f"Error al guardar la foto del trabajador ({id_trabajador}): {e}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido guardar la imagen.",
        )

    timestamp = int(datetime.now().timestamp())
    ruta_relativa = f"/api/archivos/fotos_trabajadores/{nombre_archivo}?t={timestamp}"

    setattr(trabajador, "foto_url", ruta_relativa)
    setattr(trabajador, "updated_at", datetime.now())

    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': 'trabajadores',
                'accion': 'modificar_foto',
            },
            trabajador_id=trabajador.id,
        )
        db.commit()

        trabajador_con_foto = (
            db.query(Trabajadores).options(
                joinedload(Trabajadores.empresa),
            )
            .filter(Trabajadores.id == id_trabajador)
            .first()
        )

        return trabajador_con_foto
    except Exception as e:
        db.rollback()
        print(f"No se ha podido modificar la foto del trabajador: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail='No se ha podido modificar la foto del trabajador.'
        )


@router.patch(
    "/me",
    response_model=TrabajadorResponse,
    summary="Modificar mis datos personales de trabajador",
    description="Actualiza los campos personales permitidos de la ficha propia.",
)
@limiter.limit("20/minute")
def modificar_mi_ficha_trabajador(
    request: Request,
    payload: TrabajadorAutogestionUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([
        AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.TRABAJADORES + "-" + AlcancePermisoEnum.PROPIO
    ])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**PATCH /api/trabajadores/me**

    Actualiza los datos personales permitidos de la ficha propia.
    """
    cambios = payload.model_dump(exclude_unset=True)
    if not cambios:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe indicar al menos un campo para actualizar.",
        )
    trabajador = db.query(Trabajadores).filter(
        Trabajadores.usuario_id == usuario_actual.id,
        Trabajadores.empresa_id == request.headers.get("Empresa-ID"),
    ).first()
    if trabajador is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró una ficha de trabajador vinculada a la cuenta.",
        )
    for campo, valor in cambios.items():
        setattr(trabajador, campo, valor)
    setattr(trabajador, "updated_at", datetime.now())
    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={"recurso": "trabajadores", "accion": "modificar_datos_propios"},
        trabajador_id=trabajador.id,
    )
    db.commit()
    db.refresh(trabajador)
    return trabajador

@router.patch(
    "/{id_trabajador}/estado",
    response_model=TrabajadorResponse,
    summary="Modificar el estado del trabajador",
    description="Modifica el estado de un trabajador (ej. Trabajando, Descansando, De vacaciones, etc.).",
)
@limiter.limit("20/minute")
def modificar_estado_trabajador(
    request: Request,
    id_trabajador: UUID,
    payload: TrabajadorUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PATCH /api/trabajadores/{id_trabajador}/estado**

    Modifica el estado de un trabajador (ej. Trabajando, Descansando, De vacaciones, etc.).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación para el trabajador ({id_trabajador}) a '{payload.estado}' desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado."
        )

    setattr(trabajador, "estado", payload.estado)
    setattr(trabajador, "updated_at", datetime.now())

    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': 'trabajadores',
                'accion': 'modificar_estado',
            },
            trabajador_id=trabajador.id,
        )
        db.commit()

        trabajador_actualizado = (
            db.query(Trabajadores).options(
                joinedload(Trabajadores.empresa),
            )
            .filter(Trabajadores.id == id_trabajador)
            .first()
        )

        return trabajador_actualizado

    except Exception as e:
        db.rollback()
        print(f"No se ha podido modificar el estado del trabajador: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido modificar el estado del trabajador.'
        )


@router.patch(
    "/{id_trabajador}",
    response_model=TrabajadorResponse,
    summary="Modificar trabajador",
    description="Modifica los datos de un trabajador.",
)
@limiter.limit("20/minute")
def modificar_trabajador(
    request: Request,
    id_trabajador: UUID,
    payload: TrabajadorUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PATCH /api/trabajadores/{id_trabajador}**

    Modifica los datos de un trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación del trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Trabajador no encontrado."
        )

    if "usuario_id" in payload.model_fields_set and payload.usuario_id is not None:
        usuario_vinculado = db.query(Usuarios).filter(
            Usuarios.id == payload.usuario_id,
            Usuarios.activo.is_(True),
        ).first()
        if usuario_vinculado is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se encontró un usuario activo con ese identificador.")
        trabajador_existente = db.query(Trabajadores.id).filter(
            Trabajadores.usuario_id == payload.usuario_id,
            Trabajadores.id != trabajador.id,
        ).first()
        if trabajador_existente is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El usuario ya está vinculado a otro trabajador.")
        membresia_trabajador = (
            db.query(UsuariosEmpresas.id)
            .join(Roles, Roles.id == UsuariosEmpresas.rol_id)
            .filter(
                UsuariosEmpresas.usuario_id == payload.usuario_id,
                UsuariosEmpresas.empresa_id == trabajador.empresa_id,
                UsuariosEmpresas.activo.is_(True),
                Roles.tipo == TipoRolEnum.TRABAJADOR,
            )
            .first()
        )
        if membresia_trabajador is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El usuario no tiene una membresía de trabajador activa en esta empresa.")

    datos_actualizacion = payload.model_dump(exclude_unset=True)

    for field, value in datos_actualizacion.items():
        setattr(trabajador, field, value)

    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': 'trabajadores',
                'accion': 'modificar',
            },
            trabajador_id=trabajador.id,
        )
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"No se han podido modificar los datos del trabajador: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se han podido modificar los datos del trabajador.'
        )

    trabajador_actualizado = (
        db.query(Trabajadores).options(
            joinedload(Trabajadores.empresa),
        )
        .filter(Trabajadores.id == id_trabajador)
        .first()
    )

    return trabajador_actualizado

