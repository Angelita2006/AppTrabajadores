from datetime import date, datetime
from pathlib import Path
from typing import List, Optional
from uuid import UUID
import os
import shutil

from fastapi import APIRouter, Depends, File, HTTPException, Request, status, UploadFile
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import func
from sqlalchemy.orm import joinedload, Session

from core.archivos import CARPETA_FOTOS_TRABAJADORES
from core.auditoria import registrar_auditoria
from core.database import get_db
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    EstadoTrabajadorEnum,
    TipoPermisoEnum,
    TipoRolEnum,
)
from core.security import (
    get_db_with_advanced_security,
    obtener_usuario_actual,
    verificar_permisos_requeridos,
    verify_password,
)
from models.asignaciones_turno import AsignacionesTurno
from models.contratos import Contratos
from models.trabajadores import Trabajadores
from models.turnos import Turnos
from models.usuarios import Usuarios
from models.usuarios_empresas import UsuariosEmpresas
from schemas.auth import LoginRequest
from schemas.empresas import EmpresaSimpleResponse
from schemas.trabajadores import TrabajadorCreate, TrabajadorResponse, TrabajadorUpdate

# APIRouter agrupa todos los endpoints relacionados con la gestión de trabajadores bajo el prefijo "/api/trabajadores".
router = APIRouter(prefix="/api/trabajadores", tags=["Trabajadores"])
# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)


class AsignarTurnosRequest(BaseModel):
    turnos: List[UUID]
    fecha_inicio: date
    fecha_fin: Optional[date] = None


class ActualizarEstadoRequest(BaseModel):
    estado: EstadoTrabajadorEnum

@router.get(
    "/empresa/{id_empresa}",
    response_model=List[TrabajadorResponse],
    summary="Obtener trabajadores por empresa",
)
@limiter.limit("60/minute")
def obtener_trabajadores_por_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/trabajadores/empresa/{id_empresa}**

    Recupera la lista de trabajadores de una empresa específica validando permisos de tenant.
    """
    # Registrar la dirección IP del cliente y trazas de auditoría de acceso
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de trabajadores de la empresa ({id_empresa}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")

    # Validar aislamiento multi-tenant
    if request.headers.get("Empresa-ID") and request.headers.get("Empresa-ID") != str(id_empresa):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para ver los trabajadores de esta empresa."
        )

    trabajadores = (
        db.query(Trabajadores)
        .options(
            joinedload(Trabajadores.empresa),
            joinedload(Trabajadores.rol),
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
        detalle={'recurso': 'trabajadores', 'accion': 'obtener_por_empresa', 'entidad_id': str(id_empresa), 'detalles': f'Se consultó el listado de trabajadores de la empresa {id_empresa}'},
        trabajador_id=None,
    )
    db.commit()

    return trabajadores


@router.get(
    "/{id_trabajador}",
    response_model=TrabajadorResponse,
    summary="Obtener trabajador por ID",
)
@limiter.limit("60/minute")
def obtener_trabajador(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/trabajadores/{id_trabajador}**

    Busca los detalles de un empleado validando el acceso a su tenant.
    """
    # Registrar la dirección IP del cliente y trazas de auditoría
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle del trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")

    trabajador = (
        db.query(Trabajadores)
        .options(
            joinedload(Trabajadores.empresa),
            joinedload(Trabajadores.rol),
        )
        .filter(Trabajadores.id == id_trabajador)
        .first()
    )

    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado en el sistema."
        )

    # Validar permisos de acceso (pertenencia a empresa o ser el propio trabajador)
    if request.headers.get("Empresa-ID") != str(trabajador.empresa_id):
        if not hasattr(usuario_actual, "trabajador_id") or usuario_actual.trabajador_id != id_trabajador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para consultar este expediente personal."
            )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={'recurso': 'trabajadores', 'accion': 'obtener_por_id', 'entidad_id': str(id_trabajador), 'detalles': f'Se consultó el expediente del trabajador {id_trabajador}'},
        trabajador_id=None,
    )
    db.commit()

    return trabajador


@router.get(
    "/{id_trabajador}/empresa",
    response_model=EmpresaSimpleResponse,
    summary="Obtener empresa del trabajador",
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

    Recupera la empresa vinculada al expediente validando permisos.
    """
    # Registrar la dirección IP del cliente y trazas de auditoría
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de empresa del trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")

    trabajador = (
        db.query(Trabajadores)
        .options(
            joinedload(Trabajadores.empresa),
            joinedload(Trabajadores.rol),
        )
        .filter(Trabajadores.id == id_trabajador)
        .first()
    )

    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado en el sistema."
        )

    if request.headers.get("Empresa-ID") != str(trabajador.empresa_id):
        if not hasattr(usuario_actual, "trabajador_id") or usuario_actual.trabajador_id != id_trabajador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes autorización para ver las empresas vinculadas a este trabajador."
            )

    if not trabajador.empresa:
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
        detalle={'recurso': 'trabajadores', 'accion': 'obtener_empresa', 'entidad_id': str(id_trabajador), 'detalles': f'Se consultó la empresa vinculada al trabajador {id_trabajador}'},
        trabajador_id=None,
    )
    db.commit()

    return trabajador.empresa


@router.post(
    "",
    response_model=TrabajadorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar trabajador",
)
@limiter.limit("15/minute")
def registrar_trabajador(
    request: Request,
    obj_in: TrabajadorCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/trabajadores**

    Registra un nuevo empleado guardando su rol opcional y validando aislamientos.
    """
    # Registrar metadatos de red y auditoría de la creación
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de trabajador desde la IP ({cliente_ip})")

    email_limpio = str(obj_in.email).strip().lower() if obj_in.email else None
    if email_limpio:
        email_trabajador_existente = db.query(Trabajadores).filter(
            Trabajadores.email == email_limpio,
            Trabajadores.activo.is_(True),
        ).first()
        email_usuario_existente = db.query(Usuarios).filter(
            Usuarios.email == email_limpio,
            Usuarios.activo.is_(True),
        ).first()
        if email_trabajador_existente or email_usuario_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electrónico ya está asignado a otro trabajador activo."
            )

    identidad_existente = db.query(Trabajadores).filter(
        Trabajadores.empresa_id == obj_in.empresa_id,
        Trabajadores.dni_nif_nie == obj_in.dni_nif_nie
    ).first()

    if identidad_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un trabajador registrado con este NIF/NIE dentro de la misma empresa."
        )

    # Creamos el trabajador incluyendo el rol_id recibido en el payload de creación
    nuevo_trabajador = Trabajadores(
        empresa_id=obj_in.empresa_id,
        dni_nif_nie=obj_in.dni_nif_nie,
        nombre=obj_in.nombre,
        apellidos=obj_in.apellidos,
        email=email_limpio,
        telefono=obj_in.telefono,
        numero_seguridad_social=obj_in.numero_seguridad_social,
        fecha_nacimiento=obj_in.fecha_nacimiento,
        rol_id=obj_in.rol_id
    )

    try:
        db.add(nuevo_trabajador)
        db.flush()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=obj_in.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={'recurso': 'trabajadores', 'accion': 'registrar', 'entidad_id': str(nuevo_trabajador.id), 'detalles': f'Se registró el trabajador {nuevo_trabajador.id}'},
            trabajador_id=None,
        )

        db.commit()

        trabajador_con_relacion = (
            db.query(Trabajadores)
            .options(
                joinedload(Trabajadores.empresa),
                joinedload(Trabajadores.rol),
            )
            .filter(Trabajadores.id == nuevo_trabajador.id)
            .first()
        )

        return trabajador_con_relacion
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar registrar_trabajador: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido registrar el trabajador en la base de datos'
        )


@router.post(
    "/login",
    response_model=TrabajadorResponse,
    summary="Login de trabajador",
)
@limiter.limit("5/minute")
def login_trabajador(
    request: Request,
    credenciales: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    **POST /api/trabajadores/login**

    Valida las credenciales utilizando verificación segura de hash contra la tabla central de usuarios.
    """
    # Registrar IP del intento de inicio de sesión para control de seguridad
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Intento de login de trabajador desde la IP ({cliente_ip}) con correo: {credenciales.email}")

    usuario_cuenta = db.query(Usuarios).filter(
        Usuarios.email == str(credenciales.email).strip().lower(),
        Usuarios.activo.is_(True),
    ).first()

    if not usuario_cuenta or not verify_password(credenciales.password, str(usuario_cuenta.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El correo electrónico o la contraseña introducidos son incorrectos."
        )

    if not usuario_cuenta.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra desactivada temporalmente."
        )

    if not usuario_cuenta.trabajador_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Esta cuenta de acceso no tiene un expediente de empleado vinculado."
        )

    trabajador = (
        db.query(Trabajadores)
        .options(
            joinedload(Trabajadores.empresa),
            joinedload(Trabajadores.rol),
        )
        .filter(Trabajadores.id == usuario_cuenta.trabajador_id)
        .first()
    )

    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El expediente de empleado asociado no existe en el sistema."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_cuenta.id,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={'recurso': 'trabajadores', 'accion': 'login', 'entidad_id': str(trabajador.id), 'detalles': f'Inicio de sesión del trabajador {trabajador.id}'},
        trabajador_id=None,
    )
    db.commit()

    return trabajador


@router.post(
    "/turnos/{id_trabajador}",
    status_code=status.HTTP_200_OK,
    summary="Asignar turnos a trabajador",
)
@limiter.limit("15/minute")
def asignar_turnos_trabajador(
    request: Request,
    id_trabajador: UUID,
    obj_in: AsignarTurnosRequest,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/trabajadores/turnos/{id_trabajador}**

    Asigna turnos masivamente a un trabajador validando el ámbito de la empresa.
    """
    # Registrar metadatos de red y auditoría de la asignación de turnos
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de asignación de turnos al trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado."
        )

    if request.headers.get("Empresa-ID") != str(trabajador.empresa_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para asignar turnos a este trabajador de otra empresa."
        )

    try:
        nuevas_asignaciones = []
        for turno_id in obj_in.turnos:
            turno_existe = db.query(Turnos).filter(Turnos.id == turno_id).first()
            if not turno_existe:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"El turno no existe en el catálogo."
                )
            if turno_existe.empresa_id != trabajador.empresa_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El turno no pertenece a la empresa del trabajador."
                )

            nueva_asignacion = AsignacionesTurno(
                empresa_id=trabajador.empresa_id,
                trabajador_id=id_trabajador,
                turno_id=turno_id,
                fecha_inicio=obj_in.fecha_inicio,
                fecha_fin=obj_in.fecha_fin,
            )
            db.add(nueva_asignacion)
            nuevas_asignaciones.append(nueva_asignacion)

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={'recurso': 'trabajadores', 'accion': 'asignar_turnos', 'entidad_id': str(id_trabajador), 'detalles': f'Se asignaron {len(nuevas_asignaciones)} turnos al trabajador {id_trabajador}'},
            trabajador_id=None,
        )

        db.commit()

        return {
            "status": "success",
            "detail": f"Se han asignado exitosamente {len(nuevas_asignaciones)} turnos al trabajador.",
            "trabajador_id": id_trabajador,
            "turnos_asignados": obj_in.turnos
        }

    except HTTPException as http_error:
        db.rollback()
        raise http_error
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar asignar_turnos_trabajador: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido procesar la asignación múltiple de turnos'       )


@router.patch(
    "/{id_trabajador}",
    response_model=TrabajadorResponse,
    summary="Actualizar trabajador",
)
@limiter.limit("20/minute")
def actualizar_trabajador(
    request: Request,
    id_trabajador: UUID,
    obj_in: TrabajadorUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PATCH /api/trabajadores/{id_trabajador}**

    Actualiza datos de un trabajador (incluyendo su rol) validando pertenencia a la empresa.
    """
    # Registrar metadatos de red y auditoría de la actualización
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación del trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")
    # Validaciones estructurales básicas

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado en el sistema.")

    if request.headers.get("Empresa-ID") != str(trabajador.empresa_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar este trabajador."
        )

    datos_actualizacion = obj_in.model_dump(exclude_unset=True)

    if "email" in datos_actualizacion:
        email_nuevo = datos_actualizacion["email"]
        email_nuevo = str(email_nuevo).strip().lower() if email_nuevo else None
        datos_actualizacion["email"] = email_nuevo
        if email_nuevo:
            email_trabajador_existente = db.query(Trabajadores).filter(
                Trabajadores.email == email_nuevo,
                Trabajadores.activo.is_(True),
                Trabajadores.id != id_trabajador,
            ).first()
            usuario_asociado_actual = db.query(Usuarios).filter(
                Usuarios.trabajador_id == id_trabajador,
            ).first()
            email_usuario_existente = db.query(Usuarios).filter(
                Usuarios.email == email_nuevo,
                Usuarios.activo.is_(True),
                Usuarios.id != getattr(usuario_asociado_actual, "id", None),
            ).first()
            if email_trabajador_existente or email_usuario_existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El correo electrónico ya está asignado a otro trabajador activo."
                )

    for field, value in datos_actualizacion.items():
        setattr(trabajador, field, value)

    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={'recurso': 'trabajadores', 'accion': 'actualizar', 'entidad_id': str(id_trabajador), 'detalles': f'Se actualizó el trabajador {id_trabajador}'},
            trabajador_id=None,
        )
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar actualizar_trabajador: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se han podido actualizar los datos del trabajador'
        )

    # Mantener la cuenta de acceso vinculada al expediente, aunque cambie el correo.
    if "email" in datos_actualizacion or "rol_id" in datos_actualizacion:
        usuario_asociado = db.query(Usuarios).filter(Usuarios.trabajador_id == id_trabajador).first()
        if usuario_asociado:
            if datos_actualizacion.get("email"):
                usuario_asociado.email = str(datos_actualizacion["email"])
            ur_existente = db.query(UsuariosEmpresas).filter(
                UsuariosEmpresas.usuario_id == usuario_asociado.id,
                UsuariosEmpresas.empresa_id == trabajador.empresa_id
            ).first()
            if trabajador.rol_id:
                if ur_existente:
                    ur_existente.rol_id = trabajador.rol_id
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
                print(f"Error al guardar los cambios de cuenta del trabajador ({id_trabajador}): {e}")
                db.rollback()

    trabajador_actualizado = (
        db.query(Trabajadores)
        .options(
            joinedload(Trabajadores.empresa),
            joinedload(Trabajadores.rol),
        )
        .filter(Trabajadores.id == id_trabajador)
        .first()
    )

    return trabajador_actualizado


@router.patch(
    "/{id_trabajador}/estado",
    response_model=TrabajadorResponse,
    summary="Actualizar estado operativo del trabajador",
)
@limiter.limit("20/minute")
def actualizar_estado_trabajador(
    request: Request,
    id_trabajador: UUID,
    obj_in: ActualizarEstadoRequest,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PATCH /api/trabajadores/{id_trabajador}/estado**

    Permite modificar de forma específica y rápida el estado operativo de un trabajador
    (ej. Trabajando, Descansando, De vacaciones, etc.) validando el ámbito de la empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación para el trabajador ({id_trabajador}) a '{obj_in.estado}' desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")
    # Validaciones estructurales básicas

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado en el sistema."
        )

    # Validar aislamiento multi-tenant
    if request.headers.get("Empresa-ID") and request.headers.get("Empresa-ID") != str(trabajador.empresa_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar el estado de trabajadores de otra empresa."
        )

    # Actualizar estado y marca de tiempo de modificación
    trabajador.estado = obj_in.estado
    trabajador.updated_at = datetime.now()

    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={'recurso': 'trabajadores', 'accion': 'actualizar_estado', 'entidad_id': str(id_trabajador), 'detalles': f"Se actualizó el estado del trabajador {id_trabajador} a '{obj_in.estado}'"},
            trabajador_id=None,
        )
        db.commit()

        # Cargar relaciones para retornar el objeto completo de respuesta
        trabajador_actualizado = (
            db.query(Trabajadores)
            .options(
                joinedload(Trabajadores.empresa),
                joinedload(Trabajadores.rol),
            )
            .filter(Trabajadores.id == id_trabajador)
            .first()
        )

        return trabajador_actualizado

    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar actualizar_estado_trabajador: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido actualizar el estado del trabajador'
        )


@router.put(
    "/{id_trabajador}/foto",
    response_model=TrabajadorResponse,
    summary="Actualizar foto de trabajador",
)
@limiter.limit("20/minute")
async def actualizar_foto_trabajador(
    request: Request,
    id_trabajador: UUID,
    file: UploadFile = File(...),
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PUT /api/trabajadores/{id_trabajador}/foto**

    Sube y actualiza la fotografía de perfil de un trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación para el trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")
    # Validaciones estructurales básicas

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado en el sistema.")

    assert file.filename is not None

    TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type not in TIPOS_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo seleccionado no es una imagen válida (formatos permitidos: JPEG, PNG, JPG, WEBP)."
        )

    extension = file.filename.split(".")[-1].lower()
    if extension not in ["png", "jpg", "jpeg", "webp"]:
        extension = "png"

    # 1. Asegurar que la carpeta física existe
    os.makedirs(CARPETA_FOTOS_TRABAJADORES, exist_ok=True)

    # 2. Eliminar fotos anteriores del trabajador con cualquier extensión (evita archivos basura y conflictos)
    for ext_posible in ["png", "jpg", "jpeg", "webp"]:
        archivo_antiguo = CARPETA_FOTOS_TRABAJADORES / f"trabajador_{id_trabajador}.{ext_posible}"
        if archivo_antiguo.exists():
            try:
                os.remove(archivo_antiguo)
            except Exception as e:
                print(f"No se pudo eliminar la foto anterior del trabajador ({id_trabajador}): {e}")

    nombre_archivo = f"trabajador_{id_trabajador}.{extension}"
    ruta_destino = CARPETA_FOTOS_TRABAJADORES / nombre_archivo

    try:
        with open(ruta_destino, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        print(f"Error al ejecutar actualizar_foto_trabajador: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='No se ha podido guardar el archivo de imagen en el servidor'
        )

    # 3. Añadir timestamp (?t=...) para invalidar la caché del cliente móvil al instante
    timestamp = int(datetime.now().timestamp())
    ruta_relativa = f"/api/archivos/fotos_trabajadores/{nombre_archivo}?t={timestamp}"

    trabajador.foto_url = ruta_relativa
    trabajador.updated_at = datetime.now()

    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={'recurso': 'trabajadores', 'accion': 'actualizar_foto', 'entidad_id': str(id_trabajador), 'detalles': f'Se actualizó la foto del trabajador {id_trabajador}'},
            trabajador_id=None,
        )
        db.commit()

        trabajador_con_foto = (
            db.query(Trabajadores)
            .options(
                joinedload(Trabajadores.empresa),
                joinedload(Trabajadores.rol),
            )
            .filter(Trabajadores.id == id_trabajador)
            .first()
        )

        return trabajador_con_foto
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar actualizar_foto_trabajador: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No se ha podido actualizar la URL de la foto en la base de datos')


@router.post(
    "/{id_trabajador}/baja-total",
    status_code=status.HTTP_200_OK,
    summary="Baja total y coordinada de un trabajador",
)
@limiter.limit("10/minute")
def baja_total_trabajador(
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
    print(f"Petición de modificación de baja lógica del trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")
    # Validaciones estructurales básicas

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado.")

    if request.headers.get("Empresa-ID") != str(trabajador.empresa_id):
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar trabajadores de otra empresa.")

    try:
        fecha_actual = date.today()

        # 1. Actualizar estado del trabajador
        trabajador.activo = False
        trabajador.fecha_baja_empresa = fecha_actual

        # 2. Rescindir contrato activo (Ajusta según tu modelo de contratos)
        contratos_activos = db.query(Contratos).filter(
            Contratos.trabajador_id == id_trabajador,
            Contratos.activo == True
        ).all()
        for contrato in contratos_activos:
            contrato.activo = False
            contrato.fecha_fin = fecha_actual

        # 3. Inactivar la cuenta vinculada. Se conserva la relación histórica.
        usuario_asociado = db.query(Usuarios).filter(Usuarios.trabajador_id == id_trabajador).first()
        if usuario_asociado:
            usuario_asociado.activo = False

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={'recurso': 'trabajadores', 'accion': 'baja_total', 'entidad_id': str(id_trabajador), 'detalles': f'Se procesó la baja total del trabajador {id_trabajador}'},
            trabajador_id=None,
        )

        db.commit()
        return {"detail": f"Baja total procesada correctamente para el trabajador {id_trabajador}."}

    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar baja_total_trabajador: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='No se ha podido tramitar la baja total. Se ha revertido la operación.',
        )

@router.delete(
    "/{id_trabajador}",
    status_code=status.HTTP_200_OK,
    summary="Eliminar trabajador",
)
@limiter.limit("20/minute")
def eliminar_trabajador(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.ELIMINAR + "-" + TipoPermisoEnum.TRABAJADORES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **DELETE /api/trabajadores/{id_trabajador}**

    Elimina un trabajador validando privilegios de administración o empresa.
    """
    # Registrar metadatos de red y auditoría de la eliminación
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de eliminación del trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no localizado en el sistema."
        )

    if request.headers.get("Empresa-ID") != str(trabajador.empresa_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar este trabajador perteneciente a otra empresa."
        )

    try:
        empresa_id_aux = trabajador.empresa_id
        db.delete(trabajador)

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=empresa_id_aux,
            accion=AccionAuditoriaEnum.ELIMINACION,
            detalle={'recurso': 'trabajadores', 'accion': 'eliminar', 'entidad_id': str(id_trabajador), 'detalles': f'Se eliminó el trabajador {id_trabajador}'},
            trabajador_id=None,
        )

        db.commit()
        return {"detail": f"Trabajador con ID {id_trabajador} eliminado correctamente junto con su planificación en cascada."}
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar eliminar_trabajador: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se puede eliminar el trabajador debido a restricciones de integridad referencial.'
        )
