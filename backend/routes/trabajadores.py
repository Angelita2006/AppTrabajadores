from datetime import date, datetime
from typing import List
from uuid import UUID
import os
import shutil

from fastapi import APIRouter, Depends, File, HTTPException, Request, status, UploadFile
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import joinedload, Session

from core.archivos import CARPETA_FOTOS_TRABAJADORES
from core.auditoria import registrar_auditoria
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    TipoPermisoEnum,
)
from core.security import (
    get_db_with_advanced_security,
    verificar_permisos_requeridos,
)
from models.contratos import Contratos
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from models.usuarios_empresas import UsuariosEmpresas
from schemas.empresas import EmpresaSimpleResponse
from schemas.trabajadores import TrabajadorCreate, TrabajadorResponse, TrabajadorUpdate

# APIRouter agrupa todos los endpoints relacionados con la gestión de trabajadores bajo el prefijo "/api/trabajadores".
router = APIRouter(prefix="/api/trabajadores", tags=["Trabajadores"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

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
        joinedload(Trabajadores.rol))
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
    "/{id_trabajador}",
    response_model=TrabajadorResponse,
    summary="Obtener trabajador por id",
    description="Obtiene un trabajador por su id.",
)
@limiter.limit("60/minute")
def obtener_trabajador_id(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.TRABAJADORES])),
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
        joinedload(Trabajadores.rol))
        .filter(Trabajadores.id == id_trabajador)
        .first()
    )

    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado en el sistema."
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
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.TRABAJADORES])),
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
        joinedload(Trabajadores.rol))
        .filter(Trabajadores.id == id_trabajador)
        .first()
    )

    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado en el sistema."
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

@router.post(
    "",
    response_model=TrabajadorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear trabajador",
    description="Crea un nuevo trabajador guardando su rol.",
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

    Crea un nuevo trabajador guardando su rol.
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

    nuevo_trabajador = Trabajadores(
        empresa_id=payload.empresa_id,
        dni_nif_nie=payload.dni_nif_nie,
        nombre=payload.nombre,
        apellidos=payload.apellidos,
        numero_seguridad_social=payload.numero_seguridad_social,
        fecha_nacimiento=payload.fecha_nacimiento,
        rol_id=payload.rol_id
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
            joinedload(Trabajadores.rol))
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

    # Mantener la cuenta de acceso vinculada al expediente, aunque cambie el correo.
    usuario_asociado = db.query(Usuarios).filter(Usuarios.trabajador_id == id_trabajador).first()
    if usuario_asociado:
        ur_existente = db.query(UsuariosEmpresas).filter(
            UsuariosEmpresas.usuario_id == usuario_asociado.id,
            UsuariosEmpresas.empresa_id == trabajador.empresa_id
        ).first()
        if trabajador.rol_id:
            if ur_existente:
                setattr(ur_existente, 'rol_id', trabajador.rol_id)
            else:
                nuevo_ur = UsuariosEmpresas(
                    usuario_id=usuario_asociado.id,
                    rol_id=trabajador.rol_id,
                    empresa_id=trabajador.empresa_id
                )
                db.add(nuevo_ur)
        else:
            if ur_existente:
                db.delete(ur_existente)
        try:
            db.commit()
        except Exception as e:
            print(f"No se han podido modificar los datos del trabajador ({id_trabajador}): {str(e)}.")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='No se han podido modificar los datos del trabajador.'
            )

    trabajador_actualizado = (
        db.query(Trabajadores).options(
        joinedload(Trabajadores.empresa),
        joinedload(Trabajadores.rol))
        .filter(Trabajadores.id == id_trabajador)
        .first()
    )

    return trabajador_actualizado

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
            joinedload(Trabajadores.rol))
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

    assert file.filename is not None

    TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type not in TIPOS_PERMITIDOS:
        print("El archivo seleccionado no es una imagen válida (formatos permitidos: JPEG, PNG, JPG, WEBP).")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo seleccionado no es una imagen válida (formatos permitidos: JPEG, PNG, JPG, WEBP)."
        )

    extension = file.filename.split(".")[-1].lower()
    if extension not in ["png", "jpg", "jpeg", "webp"]:
        extension = "png"

    os.makedirs(CARPETA_FOTOS_TRABAJADORES, exist_ok=True)

    for ext_posible in ["png", "jpg", "jpeg", "webp"]:
        archivo_antiguo = CARPETA_FOTOS_TRABAJADORES / f"trabajador_{id_trabajador}.{ext_posible}"
        if archivo_antiguo.exists():
            try:
                os.remove(archivo_antiguo)
            except Exception as e:
                print(f"No se pudo eliminar la foto anterior del trabajador ({id_trabajador}): {str(e)}.")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se pudo eliminar la foto anterior del trabajador."
                )

    nombre_archivo = f"trabajador_{id_trabajador}.{extension}"
    ruta_destino = CARPETA_FOTOS_TRABAJADORES / nombre_archivo

    try:
        with open(ruta_destino, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        print(f"Error al ejecutar actualizar_foto_trabajador: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='No se ha podido guardar el archivo de imagen en el servidor.'
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
            joinedload(Trabajadores.rol))
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
            Contratos.activo == True
        ).all()
        for contrato in contratos_activos:
            setattr(contrato, 'activo', False)
            setattr(contrato, 'fecha_fin', fecha_actual)

        usuario_asociado = db.query(Usuarios).filter(Usuarios.trabajador_id == id_trabajador).first()
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