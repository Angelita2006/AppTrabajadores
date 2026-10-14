from datetime import date, datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload, Session

from core.auditoria import registrar_auditoria
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    TipoPermisoEnum,
    TipoRolEnum,
)
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from models.empresas import Empresas
from models.gestorias_empresas import GestoriasEmpresas
from models.roles import Roles
from models.usuarios import Usuarios
from models.usuarios_empresas import UsuariosEmpresas
from schemas.gestorias_empresas import (
    GestoriaEmpresaCreate,
    GestoriaEmpresaSimpleResponse,
    GestoriaEmpresaUpdate,
)

# APIRouter agrupa todos los endpoints relacionados con las relaciones entre gestorías y empresas bajo el prefijo "/api/gestorias-empresas".
router = APIRouter(prefix="/api/gestorias-empresas", tags=["Gestorías y empresas"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

def _empresa_contexto(request: Request) -> UUID:
    valor = request.headers.get("Empresa-ID")
    try:
        return UUID(valor) if valor else None
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="La cabecera Empresa-ID no contiene un UUID válido.") from exc


def _relacion_gestoria(db: Session, id_relacion: UUID) -> GestoriasEmpresas:
    relacion = (
        db.query(GestoriasEmpresas)
        .options(
            joinedload(GestoriasEmpresas.empresa_gestora),
            joinedload(GestoriasEmpresas.empresa_cliente),
        )
        .filter(GestoriasEmpresas.id == id_relacion)
        .first()
    )
    if not relacion:
        raise HTTPException(status_code=404, detail="No se encontró la autorización entre gestoría y empresa.")
    return relacion


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
    response_model=List[GestoriaEmpresaSimpleResponse],
    summary="Listar autorizaciones de gestoría",
)
@limiter.limit("60/minute")
def listar_autorizaciones_gestoria(
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.GESTORIAS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /api/gestorias-empresas**

    Lista las autorizaciones visibles para la empresa activa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de autorizaciones de gestoría desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    empresa_id = _empresa_contexto(request)
    if empresa_id is None:
        if not _es_superadmin_global(db, usuario_actual.id):
            raise HTTPException(status_code=400, detail="Debe seleccionar una empresa activa.")
        return db.query(GestoriasEmpresas).order_by(GestoriasEmpresas.created_at.desc()).all()
    consulta = db.query(GestoriasEmpresas).filter(
        (GestoriasEmpresas.empresa_gestora_id == empresa_id)
        | (GestoriasEmpresas.empresa_cliente_id == empresa_id)
    )
    relaciones = consulta.order_by(GestoriasEmpresas.created_at.desc()).all()
    return relaciones


@router.get(
    "/{id_relacion}",
    response_model=GestoriaEmpresaSimpleResponse,
    summary="Obtener autorización de gestoría",
)
@limiter.limit("60/minute")
def obtener_autorizacion_gestoria(
    request: Request,
    id_relacion: UUID,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.GESTORIAS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /api/gestorias-empresas/{id_relacion}**

    Obtiene una autorización relacionada con la empresa activa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de autorización de gestoría con identificador ({id_relacion}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    relacion = _relacion_gestoria(db, id_relacion)
    empresa_id = _empresa_contexto(request)
    if empresa_id not in (relacion.empresa_gestora_id, relacion.empresa_cliente_id) and not _es_superadmin_global(db, usuario_actual.id):
        raise HTTPException(status_code=404, detail="No se encontró la autorización solicitada.")
    return relacion


@router.post(
    "",
    response_model=GestoriaEmpresaSimpleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Autorizar a una gestoría sobre una empresa cliente",
)
@limiter.limit("20/minute")
def crear_autorizacion_gestoria(
    payload: GestoriaEmpresaCreate,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.GESTORIAS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**POST /api/gestorias-empresas**

    Registra la autorización de la gestoría seleccionada sobre una empresa cliente.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de autorización de gestoría desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    gestoria_id = _empresa_contexto(request)
    gestoria = db.query(Empresas).filter(Empresas.id == gestoria_id).first()
    cliente = db.query(Empresas).filter(Empresas.id == payload.empresa_cliente_id).first()
    if not gestoria or not gestoria.es_gestoria:
        raise HTTPException(status_code=403, detail="La empresa activa no está registrada como gestoría.")
    if not cliente:
        raise HTTPException(status_code=404, detail="No se encontró la empresa cliente.")
    if cliente.es_gestoria or cliente.id == gestoria.id:
        raise HTTPException(status_code=400, detail="La empresa indicada no puede ser cliente de esta autorización.")
    if not cliente.activa:
        raise HTTPException(status_code=409, detail="No se puede autorizar una empresa inactiva.")
    if payload.fecha_inicio < date.today():
        raise HTTPException(status_code=422, detail="La fecha de inicio no puede estar en el pasado.")

    relacion = GestoriasEmpresas(
        empresa_gestora_id=gestoria.id,
        empresa_cliente_id=cliente.id,
        usuario_creador_id=usuario_actual.id,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
        activo=True,
    )
    db.add(relacion)
    try:
        db.flush()
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=gestoria.id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={'recurso': 'gestorias_empresas', 'entidad_id': str(relacion.id)},
            trabajador_id=None,
        )
        db.commit()
        return relacion
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe una autorización activa entre estas empresas.") from exc


@router.patch(
    "/{id_relacion}",
    response_model=GestoriaEmpresaSimpleResponse,
    summary="Modificar autorización de gestoría",
)
@limiter.limit("20/minute")
def modificar_autorizacion_gestoria(
    id_relacion: UUID,
    payload: GestoriaEmpresaUpdate,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.GESTORIAS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**PATCH /api/gestorias-empresas/{id_relacion}**

    Actualiza la vigencia o el estado de una autorización de la gestoría activa.
    """
    # Validaciones estructurales básicas
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de autorización de gestoría con identificador ({id_relacion}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    relacion = _relacion_gestoria(db, id_relacion)
    if relacion.empresa_gestora_id != _empresa_contexto(request):
        raise HTTPException(status_code=404, detail="No se encontró la autorización solicitada.")
    cambios = payload.model_dump(exclude_unset=True)
    if not cambios:
        raise HTTPException(status_code=400, detail="Debe indicar al menos un campo para actualizar.")
    fecha_inicio = cambios.get("fecha_inicio", relacion.fecha_inicio)
    fecha_fin = cambios.get("fecha_fin", relacion.fecha_fin)
    if fecha_fin is not None and fecha_fin < fecha_inicio:
        raise HTTPException(status_code=422, detail="La fecha de fin no puede ser anterior a la fecha de inicio.")
    for campo, valor in cambios.items():
        setattr(relacion, campo, valor)
    relacion.updated_at = datetime.now(timezone.utc)
    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=relacion.empresa_gestora_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={'recurso': 'gestorias_empresas', 'entidad_id': str(id_relacion), 'campos': list(cambios)},
        trabajador_id=None,
    )
    db.commit()
    return relacion


@router.delete(
    "/{id_relacion}",
    response_model=GestoriaEmpresaSimpleResponse,
    summary="Dar de baja lógica autorización de gestoría",
    description="Revoca una autorización sin eliminar su historial.",
)
@limiter.limit("20/minute")
def revocar_autorizacion_gestoria(
    id_relacion: UUID,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.ELIMINAR + "-" + TipoPermisoEnum.GESTORIAS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **DELETE /api/gestorias-empresas/{id_relacion}**

    Da de baja una autorización de gestoría sin eliminar su historial.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de baja lógica de autorización de gestoría ({id_relacion}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")
    # Validaciones estructurales básicas
    relacion = _relacion_gestoria(db, id_relacion)
    if relacion.empresa_gestora_id != _empresa_contexto(request):
        raise HTTPException(status_code=404, detail="No se encontró la autorización solicitada.")

    try:
        if relacion.activo:
            relacion.activo = False
            relacion.updated_at = datetime.now(timezone.utc)
            registrar_auditoria(
                db=db,
                request=request,
                usuario_id=usuario_actual.id,
                empresa_id=relacion.empresa_gestora_id,
                accion=AccionAuditoriaEnum.BAJA_LOGICA,
                detalle={
                    'recurso': 'gestorias_empresas',
                    'accion': 'revocar_autorizacion',
                    'entidad_id': str(id_relacion),
                    'detalles': f'Se dio de baja lógica la autorización de gestoría {id_relacion}',
                },
                trabajador_id=None,
            )
            db.commit()
        return relacion
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar revocar_autorizacion_gestoria: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido revocar la autorización de gestoría",
        )
