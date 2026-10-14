from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from core.auditoria import registrar_auditoria
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    TipoPermisoEnum,
    TipoRolEnum,
)
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from models.empresas import Empresas
from models.roles import Roles
from models.usuarios import Usuarios
from models.usuarios_empresas import UsuariosEmpresas
from schemas.usuarios_empresas import (
    UsuarioEmpresaCreate,
    UsuarioEmpresaSimpleResponse,
    UsuarioEmpresaUpdate,
)




# APIRouter agrupa todos los endpoints relacionados con la gestión de relaciones entre usuarios y empresas bajo el prefijo "/api/usuarios-empresas".
router = APIRouter(prefix="/api/usuarios-empresas", tags=["Usuarios y empresas"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)


def _empresa_contexto(request: Request) -> UUID | None:
    valor = request.headers.get("Empresa-ID")
    if not valor:
        return None
    try:
        return UUID(valor)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="La cabecera Empresa-ID no contiene un UUID válido.") from exc


def _membresia(db: Session, id_relacion: UUID, empresa_id: UUID) -> UsuariosEmpresas:
    registro = (
        db.query(UsuariosEmpresas)
        .filter(UsuariosEmpresas.id == id_relacion, UsuariosEmpresas.empresa_id == empresa_id)
        .first()
    )
    if not registro:
        raise HTTPException(status_code=404, detail="No se encontró la membresía de usuario.")
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


def _validar_rol(db: Session, rol_id: UUID, empresa_id: UUID, actor_id: UUID) -> Roles:
    rol = db.query(Roles).filter(Roles.id == rol_id).first()
    if not rol:
        raise HTTPException(status_code=404, detail="No se encontró el rol solicitado.")
    if rol.empresa_id not in (None, empresa_id):
        raise HTTPException(status_code=400, detail="El rol no pertenece a la empresa activa.")
    if rol.tipo == TipoRolEnum.SUPERADMINISTRADOR:
        raise HTTPException(status_code=403, detail="El rol superadministrador se asigna únicamente como membresía global.")
    if rol.tipo == TipoRolEnum.AUDITOR_ITSS and not _es_superadmin_global(db, actor_id):
        raise HTTPException(status_code=403, detail="El rol de auditor solo puede asignarlo el superadministrador global.")
    if rol.tipo == TipoRolEnum.ADMIN_GESTORIA:
        empresa = db.query(Empresas).filter(Empresas.id == empresa_id).first()
        if not empresa or not empresa.es_gestoria:
            raise HTTPException(status_code=403, detail="El rol de administrador de gestoría solo puede asignarse a una gestoría.")
    return rol


@router.get(
    "/global",
    response_model=List[UsuarioEmpresaSimpleResponse],
    summary="Listar membresías globales de superadministrador",
)
@limiter.limit("60/minute")
def listar_membresias_globales(
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.USUARIOS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /api/usuarios-empresas/global**

    Lista las membresías globales de superadministrador; solo accesibles para otro superadministrador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de membresías globales desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    if not _es_superadmin_global(db, usuario_actual.id):
        raise HTTPException(status_code=403, detail="Solo el superadministrador global puede consultar membresías globales.")
    return (
        db.query(UsuariosEmpresas)
        .join(Roles, Roles.id == UsuariosEmpresas.rol_id)
        .filter(
            UsuariosEmpresas.empresa_id.is_(None),
            UsuariosEmpresas.activo.is_(True),
            Roles.tipo == TipoRolEnum.SUPERADMINISTRADOR,
        )
        .all()
    )


@router.get(
    "/empresa/{id_empresa}",
    response_model=List[UsuarioEmpresaSimpleResponse],
    summary="Listar usuarios de una empresa",
)
@limiter.limit("60/minute")
def listar_usuarios_empresa(
    id_empresa: UUID,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.USUARIOS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /api/usuarios-empresas/empresa/{id_empresa}**

    Lista membresías de la empresa activa, sin exponer credenciales de los usuarios.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de usuarios de empresa con identificador ({id_empresa}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    if id_empresa != _empresa_contexto(request):
        raise HTTPException(status_code=404, detail="No se encontró la empresa solicitada.")
    return (
        db.query(UsuariosEmpresas)
        .filter(UsuariosEmpresas.empresa_id == id_empresa)
        .order_by(UsuariosEmpresas.created_at.desc())
        .all()
    )


@router.get(
    "/usuario/{id_usuario}",
    response_model=List[UsuarioEmpresaSimpleResponse],
    summary="Listar membresías de usuario en la empresa activa",
)
@limiter.limit("60/minute")
def listar_membresias_usuario(
    id_usuario: UUID,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.USUARIOS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /api/usuarios-empresas/usuario/{id_usuario}**

    Devuelve las membresías del usuario dentro de la empresa seleccionada.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de membresías del usuario con identificador ({id_usuario}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    empresa_id = _empresa_contexto(request)
    return db.query(UsuariosEmpresas).filter(
        UsuariosEmpresas.usuario_id == id_usuario,
        UsuariosEmpresas.empresa_id == empresa_id,
    ).all()


@router.get(
    "/{id_relacion}",
    response_model=UsuarioEmpresaSimpleResponse,
    summary="Obtener membresía de usuario",
)
@limiter.limit("60/minute")
def obtener_membresia_usuario(
    id_relacion: UUID,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.USUARIOS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /api/usuarios-empresas/{id_relacion}**

    Obtiene una membresía perteneciente a la empresa activa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de membresía del usuario con identificador ({id_relacion}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    return _membresia(db, id_relacion, _empresa_contexto(request))


@router.post(
    "",
    response_model=UsuarioEmpresaSimpleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Añadir usuario a empresa",
)
@limiter.limit("20/minute")
def crear_membresia_usuario(
    payload: UsuarioEmpresaCreate,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.USUARIOS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**POST /api/usuarios-empresas**

    Crea o reactiva la membresía de un usuario en la empresa seleccionada.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de membresía de usuario desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    empresa_id = _empresa_contexto(request)
    if payload.empresa_id is None:
        if not _es_superadmin_global(db, usuario_actual.id):
            raise HTTPException(status_code=403, detail="Solo el superadministrador global puede crear membresías globales.")
        usuario = db.query(Usuarios).filter(Usuarios.id == payload.usuario_id, Usuarios.activo.is_(True)).first()
        if not usuario:
            raise HTTPException(status_code=404, detail="No se encontró un usuario activo con ese identificador.")
        rol = db.query(Roles).filter(Roles.id == payload.rol_id).first()
        if not rol or rol.tipo != TipoRolEnum.SUPERADMINISTRADOR or rol.empresa_id is not None:
            raise HTTPException(status_code=400, detail="Una membresía global requiere el rol global superadministrador.")
        existente = db.query(UsuariosEmpresas).filter(
            UsuariosEmpresas.usuario_id == payload.usuario_id,
            UsuariosEmpresas.empresa_id.is_(None),
            UsuariosEmpresas.rol_id == rol.id,
            UsuariosEmpresas.activo.is_(True),
        ).first()
        if existente:
            raise HTTPException(status_code=409, detail="El usuario ya tiene una membresía global activa.")
        membresia = UsuariosEmpresas(
            usuario_id=payload.usuario_id,
            empresa_id=None,
            rol_id=rol.id,
            activo=True if payload.activo is None else payload.activo,
        )
        db.add(membresia)
        db.flush()
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=None,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={'recurso': 'usuarios_empresas', 'entidad_id': str(membresia.id), 'alcance': 'global'},
            trabajador_id=None,
        )
        db.commit()
        return membresia
    if payload.empresa_id != empresa_id:
        raise HTTPException(status_code=403, detail="La empresa del cuerpo debe coincidir con Empresa-ID.")
    usuario = db.query(Usuarios).filter(Usuarios.id == payload.usuario_id, Usuarios.activo.is_(True)).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="No se encontró un usuario activo con ese identificador.")
    _validar_rol(db, payload.rol_id, empresa_id, usuario_actual.id)
    existente = db.query(UsuariosEmpresas).filter(
        UsuariosEmpresas.usuario_id == payload.usuario_id,
        UsuariosEmpresas.empresa_id == empresa_id,
    ).first()
    if existente and existente.activo:
        raise HTTPException(status_code=409, detail="El usuario ya tiene una membresía activa en esta empresa.")
    if existente:
        existente.rol_id = payload.rol_id
        existente.activo = True if payload.activo is None else payload.activo
        existente.updated_at = datetime.now(timezone.utc)
        membresia = existente
        accion = AccionAuditoriaEnum.MODIFICACION
    else:
        membresia = UsuariosEmpresas(
            usuario_id=payload.usuario_id,
            empresa_id=empresa_id,
            rol_id=payload.rol_id,
            activo=True if payload.activo is None else payload.activo,
        )
        db.add(membresia)
        accion = AccionAuditoriaEnum.CREACION
    db.flush()
    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=empresa_id,
        accion=accion,
        detalle={'recurso': 'usuarios_empresas', 'entidad_id': str(membresia.id)},
        trabajador_id=None,
    )
    db.commit()
    return membresia


@router.patch(
    "/{id_relacion}",
    response_model=UsuarioEmpresaSimpleResponse,
    summary="Modificar membresía de usuario",
)
@limiter.limit("20/minute")
def modificar_membresia_usuario(
    id_relacion: UUID,
    payload: UsuarioEmpresaUpdate,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.USUARIOS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**PATCH /api/usuarios-empresas/{id_relacion}**

    Actualiza el rol o el estado de una membresía de la empresa activa.
    """
    # Validaciones estructurales básicas
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de membresía de usuario con identificador ({id_relacion}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")
    empresa_id = _empresa_contexto(request)
    if empresa_id is None:
        raise HTTPException(status_code=400, detail="Debe seleccionar una empresa mediante la cabecera Empresa-ID.")
    membresia = _membresia(db, id_relacion, empresa_id)
    cambios = payload.model_dump(exclude_unset=True)
    if not cambios:
        raise HTTPException(status_code=400, detail="Debe indicar al menos un campo para actualizar.")
    if "rol_id" in cambios and cambios["rol_id"] is None:
        raise HTTPException(status_code=422, detail="El rol de la membresía no puede ser nulo.")
    if cambios.get("rol_id") is not None:
        _validar_rol(db, cambios["rol_id"], empresa_id, usuario_actual.id)
    for campo, valor in cambios.items():
        setattr(membresia, campo, valor)
    membresia.updated_at = datetime.now(timezone.utc)
    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=empresa_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={'recurso': 'usuarios_empresas', 'entidad_id': str(id_relacion), 'campos': list(cambios)},
        trabajador_id=None,
    )
    db.commit()
    return membresia


@router.delete(
    "/global/{id_relacion}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revocar membresía global de superadministrador",
    description="Revoca una membresía global sin eliminar su historial.",
)
@limiter.limit("20/minute")
def revocar_membresia_global(
    id_relacion: UUID,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.ELIMINAR + "-" + TipoPermisoEnum.USUARIOS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**DELETE /api/usuarios-empresas/global/{id_relacion}**

    Revoca una membresía global, preservando al menos un superadministrador activo.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de baja lógica de la membresía global ({id_relacion}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")
    # Validaciones estructurales básicas
    if not _es_superadmin_global(db, usuario_actual.id):
        raise HTTPException(status_code=403, detail="Solo el superadministrador global puede revocar membresías globales.")
    membresia = (
        db.query(UsuariosEmpresas)
        .join(Roles, Roles.id == UsuariosEmpresas.rol_id)
        .filter(
            UsuariosEmpresas.id == id_relacion,
            UsuariosEmpresas.empresa_id.is_(None),
            UsuariosEmpresas.activo.is_(True),
            Roles.tipo == TipoRolEnum.SUPERADMINISTRADOR,
        )
        .first()
    )
    if membresia is None:
        raise HTTPException(status_code=404, detail="No se encontró la membresía global.")
    total = (
        db.query(UsuariosEmpresas.id)
        .join(Roles, Roles.id == UsuariosEmpresas.rol_id)
        .filter(
            UsuariosEmpresas.empresa_id.is_(None),
            UsuariosEmpresas.activo.is_(True),
            Roles.tipo == TipoRolEnum.SUPERADMINISTRADOR,
        )
        .count()
    )
    if total <= 1:
        raise HTTPException(status_code=409, detail="No se puede revocar el último superadministrador global activo.")

    try:
        membresia.activo = False
        membresia.updated_at = datetime.now(timezone.utc)
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=None,
            accion=AccionAuditoriaEnum.BAJA_LOGICA,
            detalle={
                'recurso': 'usuarios_empresas',
                'accion': 'revocar_membresia_global',
                'entidad_id': str(id_relacion),
                'detalles': f'Se dio de baja lógica la membresía global {id_relacion}',
            },
            trabajador_id=None,
        )
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar revocar_membresia_global: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido revocar la membresía global",
        )


@router.delete(
    "/{id_relacion}",
    response_model=UsuarioEmpresaSimpleResponse,
    summary="Desactivar membresía de usuario",
    description="Desactiva una membresía y conserva su historial.",
)
@limiter.limit("20/minute")
def desactivar_membresia_usuario(
    id_relacion: UUID,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.ELIMINAR + "-" + TipoPermisoEnum.USUARIOS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**DELETE /api/usuarios-empresas/{id_relacion}**

    Desactiva la membresía, conservando su historial y la cuenta del usuario.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de baja lógica de la membresía de usuario ({id_relacion}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")
    # Validaciones estructurales básicas
    empresa_id = _empresa_contexto(request)
    membresia = _membresia(db, id_relacion, empresa_id)
    try:
        if membresia.activo:
            membresia.activo = False
            membresia.updated_at = datetime.now(timezone.utc)
            registrar_auditoria(
                db=db,
                request=request,
                usuario_id=usuario_actual.id,
                empresa_id=empresa_id,
                accion=AccionAuditoriaEnum.BAJA_LOGICA,
                detalle={
                    'recurso': 'usuarios_empresas',
                    'accion': 'desactivar_membresia',
                    'entidad_id': str(id_relacion),
                    'detalles': f'Se dio de baja lógica la membresía de usuario {id_relacion}',
                },
                trabajador_id=None,
            )
            db.commit()
        return membresia
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar desactivar_membresia_usuario: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido desactivar la membresía de usuario",
        )
