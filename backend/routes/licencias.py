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
    CicloFacturacionEnum,
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
    registro = (
        db.query(Licencias)
        .options(
            joinedload(Licencias.empresa),
        )
        .filter(Licencias.id == id_licencia)
        .first()
    )
    if registro is None:
        raise HTTPException(status_code=404, detail="No se encontró la licencia.")
    return registro

def _es_superadmin_global(db: Session, usuario_id: UUID) -> bool:
    return (
        db.query(UsuariosEmpresas.id)
        .join(Roles, Roles.id == UsuariosEmpresas.rol_id)
        .filter(
            UsuariosEmpresas.usuario_id == usuario_id,
            UsuariosEmpresas.empresa_id.is_(None),
            UsuariosEmpresas.activo.is_(True),
            Roles.tipo == TipoRolEnum.SUPERADMINISTRADOR,
        )
        .first()
        is not None
    )

@router.get(
    "",
    response_model=List[LicenciaSimpleResponse],
    summary="Listar licencias",
)
@limiter.limit("60/minute")
def listar_licencias(
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.LICENCIAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /api/licencias**

    Lista las licencias de la empresa activa o todas las licencias para el superadministrador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de licencias desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    return db.query(Licencias).order_by(Licencias.created_at.desc()).all()

@router.post(
    "",
    response_model=LicenciaSimpleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Emitir código de licencia",
)
@limiter.limit("10/minute")
def emitir_licencia(
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

    Emite un código canjeable sin asignarlo a una empresa; operación reservada al superadministrador global.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de emisión de licencia desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    if not _es_superadmin_global(db, usuario_actual.id):
        raise HTTPException(status_code=403, detail="Solo el superadministrador global puede emitir licencias.")
    codigo = secrets.token_hex(6).upper()
    while db.query(Licencias.id).filter(Licencias.codigo == codigo).first():
        codigo = secrets.token_hex(6).upper()
    licencia = Licencias(
        codigo=codigo,
        empresa_id=None,
        plan=payload.plan,
        ciclo=payload.ciclo,
        estado=(EstadoSuscripcionEnum.TRIALING if payload.ciclo == CicloFacturacionEnum.TRIAL else EstadoSuscripcionEnum.ACTIVA),
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
        detalle={'recurso': 'licencias', 'entidad_id': str(licencia.id), 'codigo': codigo},
    )
    db.commit()
    return licencia

@router.get(
    "/{id_licencia}",
    response_model=LicenciaResponse,
    summary="Obtener licencia",
)
@limiter.limit("60/minute")
def obtener_licencia(
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

    Devuelve el detalle de una licencia dentro del ámbito de acceso autorizado.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de licencia con identificador ({id_licencia}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    return _licencia(db, id_licencia)

@router.patch(
    "/{id_licencia}",
    response_model=LicenciaSimpleResponse,
    summary="Modificar licencia",
)
@limiter.limit("10/minute")
def modificar_licencia(
    id_licencia: UUID,
    payload: LicenciaUpdate,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.LICENCIAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**PATCH /api/licencias/{id_licencia}**

    Actualiza los datos comerciales permitidos de una licencia sin reasignar su código o empresa.
    """
    # Validaciones estructurales básicas
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de licencia con identificador ({id_licencia}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    licencia = _licencia(db, id_licencia)
    cambios = payload.model_dump(exclude_unset=True)
    if not cambios:
        raise HTTPException(status_code=400, detail="Debe indicar al menos un campo para actualizar.")
    if any(campo in cambios and cambios[campo] is None for campo in ("fecha_inicio", "fecha_expiracion")):
        raise HTTPException(status_code=422, detail="Las fechas de inicio y expiración son obligatorias.")
    inicio = cambios.get("fecha_inicio", licencia.fecha_inicio)
    expiracion = cambios.get("fecha_expiracion", licencia.fecha_expiracion)
    if expiracion is not None and expiracion < inicio:
        raise HTTPException(status_code=422, detail="La fecha de expiración no puede ser anterior a la fecha de inicio.")
    for campo, valor in cambios.items():
        setattr(licencia, campo, valor)
    licencia.updated_at = datetime.now(timezone.utc)
    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=licencia.empresa_id,
        trabajador_id=None,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={'recurso': 'licencias', 'entidad_id': str(id_licencia), 'campos': list(cambios)},
    )
    db.commit()
    return licencia

@router.delete(
    "/{id_licencia}",
    response_model=LicenciaSimpleResponse,
    summary="Dar de baja lógica licencia",
    description="Revoca una licencia y conserva su registro.",
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

    Da de baja una licencia y conserva el registro para mantener trazabilidad.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de baja lógica de la licencia ({id_licencia}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")
    # Validaciones estructurales básicas
    licencia = _licencia(db, id_licencia)

    try:
        if licencia.estado != EstadoSuscripcionEnum.CANCELADA:
            licencia.estado = EstadoSuscripcionEnum.CANCELADA
            licencia.revocada_at = datetime.now(timezone.utc)
            licencia.updated_at = licencia.revocada_at
            registrar_auditoria(
                db=db,
                request=request,
                usuario_id=usuario_actual.id,
                empresa_id=licencia.empresa_id,
                trabajador_id=None,
                accion=AccionAuditoriaEnum.BAJA_LOGICA,
                detalle={
                    'recurso': 'licencias',
                    'accion': 'revocar',
                    'entidad_id': str(id_licencia),
                    'detalles': f'Se dio de baja lógica la licencia {id_licencia}',
                },
            )
            db.commit()
        return licencia
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar revocar_licencia: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido revocar la licencia",
        )
