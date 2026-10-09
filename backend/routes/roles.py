from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.roles import Roles
from models.usuarios import Usuarios
from schemas.roles import RolCreate, RolResponse
from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum

# Configuración del enrutador para la gestión de roles del sistema y permisos de seguridad
router = APIRouter(prefix="/api/roles", tags=["Roles del Sistema"])

# Configuración del limitador de tasa de peticiones por IP para prevenir abusos y ataques de denegación
limiter = Limiter(key_func=get_remote_address)


@router.get("", response_model=List[RolResponse], summary="Obtener todos los roles")
@limiter.limit("60/minute") 
def obtener_roles(
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/roles**
    
    Obtiene la lista completa de roles del sistema disponibles.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de roles desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La cuenta de usuario se encuentra inactiva.")

    roles = db.query(Roles).all()

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=usuario_actual.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "roles", "accion": "listar_roles", "detalles": "Se consultó la lista completa de roles del sistema"}
    )
    db.commit()

    return roles


@router.get("/{id_rol}", response_model=RolResponse, summary="Obtener rol por ID")
@limiter.limit("60/minute") 
def obtener_rol_por_id(
    request: Request,
    id_rol: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/roles/{id_rol}**
    
    Obtiene un rol específico del sistema por su identificador único.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle del rol {id_rol} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La cuenta de usuario se encuentra inactiva.")
    
    rol = db.query(Roles).filter(Roles.id == id_rol).first()
    if not rol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Rol con ID {id_rol} no encontrado en el sistema.")

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=usuario_actual.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "roles", "accion": "obtener_rol_por_id", "entidad_id": str(id_rol), "detalles": f"Se consultó el detalle del rol {id_rol}"}
    )
    db.commit()

    return rol


@router.post("", response_model=RolResponse, status_code=status.HTTP_201_CREATED, summary="Crear rol de seguridad")
@limiter.limit("10/minute") 
def crear_rol_seguridad(
    request: Request,
    obj_in: RolCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.RRHH]))
):
    """
    **POST /api/roles**
    
    Registra un nuevo rol de seguridad en el sistema validando privilegios administrativos.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de rol desde la IP: {cliente_ip} por el administrador: {usuario_actual.email}")

    try:
        rol_existente = db.query(Roles).filter(Roles.nombre == obj_in.nombre).first()
        if rol_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un rol registrado con el nombre '{obj_in.nombre}'."
            )

        nuevo_rol = Roles(nombre=obj_in.nombre, descripcion=obj_in.descripcion)
        db.add(nuevo_rol)

        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=usuario_actual.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "roles", "accion": "crear_rol", "entidad_id": str(nuevo_rol.id), "detalles": f"Se creó un nuevo rol de seguridad: {obj_in.nombre}"}
        )

        db.commit()
        db.refresh(nuevo_rol)
        return nuevo_rol
    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido guardar el rol: {str(error)}"
        )