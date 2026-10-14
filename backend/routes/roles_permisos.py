from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core.auditoria import registrar_auditoria
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    TipoPermisoEnum,
    TipoRolEnum,
)
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from models.permisos import Permisos
from models.roles import Roles
from models.roles_permisos import RolesPermisos
from models.usuarios import Usuarios
from models.usuarios_empresas import UsuariosEmpresas
from schemas.roles_permisos import RolPermisoCreate, RolPermisoSimpleResponse

# APIRouter agrupa todos los endpoints relacionados con la gestión de relaciones entre roles y permisos bajo el prefijo "/api/roles-permisos".
router = APIRouter(prefix="/api/roles-permisos", tags=["Roles y permisos"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

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

def _rol_gestionable(db: Session, rol_id: UUID, empresa_id: UUID, usuario_id: UUID) -> Roles:
    rol = db.query(Roles).filter(Roles.id == rol_id).first()
    if not rol:
        print(f"Rol ({rol_id}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Rol no encontrado."
        )
    
    if rol.empresa_id is None:
        if _es_superadmin_global(db, usuario_id):
            return rol
        print("Los roles globales solo pueden modificarse desde el panel superadministrador.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Los roles globales solo pueden modificarse desde el panel superadministrador."
        )
    
    if rol.empresa_id != empresa_id:
        print("No se encontró el rol en la empresa activa.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No se encontró el rol en la empresa activa."
        )
    
    return rol

@router.get(
    "/rol/{id_rol}",
    response_model=List[RolPermisoSimpleResponse],
    summary="Listar permisos de un rol",
    description="Obtiene los permisos de un rol propio de la empresa activa.",
)
@limiter.limit("60/minute")
def obtener_permisos_rol(
    request: Request,
    id_rol: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([
        AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.ROLES_PERMISOS
    ])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/roles-permisos/rol/{id_rol}**

    Obtiene los permisos de un rol propio de la empresa activa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de permisos del rol ({id_rol}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    _rol_gestionable(db, id_rol, UUID(request.headers.get("Empresa-ID")), usuario_actual.id)
    
    return db.query(RolesPermisos).filter(RolesPermisos.rol_id == id_rol).order_by(RolesPermisos.created_at).all()

@router.post(
    "",
    response_model=RolPermisoSimpleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Asignar permiso a un rol",
    description="Asigna un permiso existente a un rol personalizado de la empresa activa.",
)
@limiter.limit("20/minute")
def crear_permiso_rol(
    request: Request,
    payload: RolPermisoCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([
        AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.ROLES_PERMISOS
    ])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/roles-permisos**

    Asigna un permiso existente a un rol personalizado de la empresa activa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de asignación de permiso a un rol desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    rol = _rol_gestionable(db, payload.rol_id, UUID(request.headers.get("Empresa-ID")), usuario_actual.id)
    permiso = db.query(Permisos).filter(Permisos.id == payload.permiso_id).first()
    if permiso is None:
        print(f"Permiso ({payload.permiso_id}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No se encontró el permiso solicitado."
        )
    
    existente = db.query(RolesPermisos).filter(
        RolesPermisos.rol_id == rol.id,
        RolesPermisos.permiso_id == permiso.id,
    ).first()
    if existente:
        print("El rol ya tiene asignado ese permiso.")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="El rol ya tiene asignado ese permiso."
        )
    
    relacion = RolesPermisos(rol_id=rol.id, permiso_id=permiso.id)
    db.add(relacion)
    
    try:
        db.flush()
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=rol.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': 'roles_permisos',
                'accion': 'crear',
            },
            trabajador_id=None,
        )
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"El rol ya tiene asignado ese permiso: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="El rol ya tiene asignado ese permiso."
        )
    return relacion

@router.delete(
    "/{id_relacion}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Retirar permiso de rol",
    description="Retira la asignación del permiso al rol.",
)
@limiter.limit("20/minute")
def retirar_permiso_rol(
    request: Request,
    id_relacion: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([
        AccionPermisoEnum.ELIMINAR + "-" + TipoPermisoEnum.ROLES_PERMISOS
    ])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **DELETE /api/roles-permisos/{id_relacion}**

    Retira la asignación del permiso al rol.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de retirada de permiso del rol ({id_relacion}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    relacion = db.query(RolesPermisos).filter(RolesPermisos.id == id_relacion).first()
    if relacion is None:
        print(f"Relación ({id_relacion}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No se encontró la asociación rol-permiso."
        )
    
    rol = _rol_gestionable(db, relacion.rol_id, UUID(request.headers.get("Empresa-ID")), usuario_actual.id)
    
    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=rol.empresa_id,
        accion=AccionAuditoriaEnum.ELIMINACION,
        detalle={
            'recurso': 'roles_permisos',
            'accion': 'retirar',
        },
        trabajador_id=None,
    )

    db.delete(relacion)
    db.commit()

    return None
