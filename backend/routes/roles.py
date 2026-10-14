from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import joinedload, Session

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
from models.roles import Roles
from models.usuarios import Usuarios
from schemas.roles import RolCreate, RolResponse

# APIRouter agrupa todos los endpoints relacionados con la gestión de roles bajo el prefijo "/api/roles".
router = APIRouter(prefix="/api/roles", tags=["Roles del Sistema"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "",
    response_model=List[RolResponse],
    summary="Obtener todos los roles",
    description="Obtiene la lista completa de roles del sistema disponibles.",
)
@limiter.limit("60/minute")
def obtener_roles(
    request: Request,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.ROLES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/roles**

    Obtiene la lista completa de roles del sistema disponibles.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de roles desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    if not usuario_actual.activo:
        print("La cuenta de usuario se encuentra inactiva.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="La cuenta de usuario se encuentra inactiva."
        )

    roles = db.query(Roles).all()

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=request.headers.get('Empresa-ID'),
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'roles',
            'accion': 'consultar_todos',
        },
        trabajador_id=None,
    )
    db.commit()

    return roles

@router.get(
    "/{id_rol}",
    response_model=RolResponse,
    summary="Obtener rol por id",
    description="Obtiene un rol específico del sistema por su id.",
)
@limiter.limit("60/minute")
def obtener_rol_por_id(
    request: Request,
    id_rol: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.ROLES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/roles/{id_rol}**

    Obtiene un rol específico del sistema por su id.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta del rol ({id_rol}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    if not usuario_actual.activo:
        print("La cuenta de usuario se encuentra inactiva.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="La cuenta de usuario se encuentra inactiva."
        )

    rol = db.query(Roles).filter(Roles.id == id_rol).first()
    if not rol:
        print(f"Rol ({id_rol}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Rol no encontrado en el sistema."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=request.headers.get('Empresa-ID'),
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'roles',
            'accion': 'consultar_id',
        },
        trabajador_id=None,
    )
    db.commit()

    return rol

@router.post(
    "",
    response_model=RolResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear rol de seguridad",
    description="Crea un nuevo rol de seguridad en el sistema.",
)
@limiter.limit("10/minute")
def crear_rol_seguridad(
    request: Request,
    payload: RolCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.ROLES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/roles**

    Crea un nuevo rol de seguridad en el sistema.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de rol desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    try:
        rol_existente = db.query(Roles).filter(Roles.nombre == payload.nombre).first()
        if rol_existente:
            print(f"Ya existe un rol registrado con el nombre '{payload.nombre}'.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un rol registrado con el nombre '{payload.nombre}'."
            )

        nuevo_rol = Roles(nombre=payload.nombre, descripcion=payload.descripcion)
        db.add(nuevo_rol)

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=request.headers.get('Empresa-ID'),
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': 'roles',
                'accion': 'crear',
            },
            trabajador_id=None,
        )

        db.commit()
        db.refresh(nuevo_rol)

        return nuevo_rol
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear el rol: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido crear el rol.'
        )
