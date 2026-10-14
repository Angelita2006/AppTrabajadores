from datetime import datetime, timezone
from typing import List
from uuid import UUID
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import joinedload, Session

from core.auditoria import registrar_auditoria
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    EstadoSuscripcionEnum,
    TipoPermisoEnum,
    TipoRolEnum,
)
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from models.licencias import Licencias
from models.roles import Roles
from models.usuarios import Usuarios
from models.usuarios_empresas import UsuariosEmpresas
from schemas.licencias import (
    LicenciaEmitirRequest,
    LicenciaResponse,
    LicenciaSimpleResponse,
    LicenciaUpdate,
)

# APIRouter agrupa todos los endpoints relacionados con la gestión de licencias bajo el prefijo "/api/licencias".
router = APIRouter(prefix="/api/licencias", tags=["Licencias"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

def _licencia(db: Session, id_licencia: UUID) -> Licencias:
    licencia = (
        db.query(Licencias).options(
        joinedload(Licencias.empresa))
        .filter(Licencias.id == id_licencia)
        .first()
    )
    if licencia is None:
        print(f"Licencia ({id_licencia}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No se encontró la licencia."
        )
    
    return licencia

def _es_superadmin_global(db: Session, usuario_id: UUID) -> bool:

    return (
        db.query(UsuariosEmpresas.id)
        .join(Roles, Roles.id == UsuariosEmpresas.rol_id)
        .filter(UsuariosEmpresas.usuario_id == usuario_id,
            UsuariosEmpresas.empresa_id.is_(None),
            UsuariosEmpresas.activo.is_(True),
            Roles.tipo == TipoRolEnum.SUPERADMINISTRADOR)
        .first()
        is not None
    )

@router.get(
    "",
    response_model=List[LicenciaSimpleResponse],
    summary="Listar licencias",
    description="Obtiene todas las licencias para el superadministrador.",
)
@limiter.limit("60/minute")
def obtener_licencias(
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.LICENCIAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /api/licencias**

    Obtiene todas las licencias para el superadministrador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de licencias desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    return db.query(Licencias).order_by(Licencias.created_at.desc()).all()

@router.post(
    "",
    response_model=LicenciaSimpleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Emitir código de licencia",
    description="Crea una nueva licencia.",
)
@limiter.limit("10/minute")
def crear_licencia(
    payload: LicenciaEmitirRequest,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.LICENCIAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**POST /api/licencias**

    Crea una nueva licencia.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de licencia desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    if not _es_superadmin_global(db, usuario_actual.id):
        print("Solo el superadministrador global puede emitir licencias.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Solo el superadministrador global puede emitir licencias."
        )
    
    codigo = secrets.token_hex(6).upper()
    while db.query(Licencias.id).filter(Licencias.codigo == codigo).first():
        codigo = secrets.token_hex(6).upper()

    licencia = Licencias(
        codigo=codigo,
        empresa_id=None,
        plan=payload.plan,
        ciclo=payload.ciclo,
        estado=payload.ciclo,
        fecha_inicio=payload.fecha_inicio,
        fecha_expiracion=payload.fecha_expiracion,
    )
    db.add(licencia)
    db.flush()

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=None,
        trabajador_id=None,
        accion=AccionAuditoriaEnum.CREACION,
        detalle={
            'recurso': 'licencias',
            'accion': 'crear',
        },
    )
    db.commit()

    return licencia

@router.get(
    "/{id_licencia}",
    response_model=LicenciaResponse,
    summary="Obtener licencia por id",
    description="Obtiene una licencia por su id.",
)
@limiter.limit("60/minute")
def obtener_licencia_id(
    request: Request,
    id_licencia: UUID,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.LICENCIAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /api/licencias/{id_licencia}**

    Obtiene una licencia por su id.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de licencia por id ({id_licencia}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    return _licencia(db, id_licencia)

@router.patch(
    "/{id_licencia}",
    response_model=LicenciaSimpleResponse,
    summary="Modificar licencia",
    description="Modifica los datos de una licencia.",
)
@limiter.limit("10/minute")
def modificar_licencia(
    request: Request,
    id_licencia: UUID,
    payload: LicenciaUpdate,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.LICENCIAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**PATCH /api/licencias/{id_licencia}**

    Modifica los datos de una licencia.
    """
    # Validaciones estructurales básicas
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de licencia con identificador ({id_licencia}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    licencia = _licencia(db, id_licencia)
    cambios = payload.model_dump(exclude_unset=True)
    if not cambios:
        print("Debe indicar al menos un campo para actualizar.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Debe indicar al menos un campo para actualizar."
        )
    
    if any(campo in cambios and cambios[campo] is None for campo in ("fecha_inicio", "fecha_expiracion")):
        print("Las fechas de inicio y expiración son obligatorias.")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail="Las fechas de inicio y expiración son obligatorias."
        )
    
    inicio = cambios.get("fecha_inicio", licencia.fecha_inicio)
    expiracion = cambios.get("fecha_expiracion", licencia.fecha_expiracion)
    if expiracion is not None and expiracion < inicio:
        print("La fecha de expiración no puede ser anterior a la fecha de inicio.")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail="La fecha de expiración no puede ser anterior a la fecha de inicio."
        )
    
    for campo, valor in cambios.items():
        setattr(licencia, campo, valor)
    setattr(licencia, "updated_at", datetime.now(timezone.utc))

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=licencia.empresa_id,
        trabajador_id=None,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={
            'recurso': 'licencias',
            'accion': 'modificar',
        },
    )
    db.commit()

    return licencia

@router.delete(
    "/{id_licencia}",
    response_model=LicenciaSimpleResponse,
    summary="Revocar licencia",
    description="Revoca una licencia pero conserva su registro.",
)
@limiter.limit("10/minute")
def revocar_licencia(
    id_licencia: UUID,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.ELIMINAR + "-" + TipoPermisoEnum.LICENCIAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **DELETE /api/licencias/{id_licencia}**

    Revoca una licencia pero conserva el registro para mantener trazabilidad.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de baja lógica de la licencia ({id_licencia}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    licencia = _licencia(db, id_licencia)

    try:
        if licencia.estado != EstadoSuscripcionEnum.CANCELADA:
            setattr(licencia, "estado", EstadoSuscripcionEnum.CANCELADA)
            setattr(licencia, "revocada_at", datetime.now(timezone.utc))
            setattr(licencia, "updated_at", licencia.revocada_at)

            registrar_auditoria(
                db=db,
                request=request,
                usuario_id=usuario_actual.id,
                empresa_id=licencia.empresa_id,
                trabajador_id=None,
                accion=AccionAuditoriaEnum.ELIMINACION,
                detalle={
                    'recurso': 'licencias',
                    'accion': 'revocar',
                },
            )
            db.commit()

        return licencia
    except Exception as e:
        db.rollback()
        print(f"No se ha podido revocar la licencia: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido revocar la licencia.",
        )
