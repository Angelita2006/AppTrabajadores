from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.permisos import Permisos
from models.usuarios import Usuarios
from schemas.permisos import PermisoCreate, PermisoResponse

# Configuración del enrutador para la gestión de permisos del sistema y control de acceso
router = APIRouter(prefix="/api/permisos", tags=["Permisos del Sistema"])

# Configuración del limitador de tasa de peticiones por IP para prevenir abusos y ataques de denegación
limiter = Limiter(key_func=get_remote_address)


@router.get("", response_model=List[PermisoResponse], summary="Obtener todos los permisos")
@limiter.limit("60/minute") # Limita las consultas masivas de listados de permisos para proteger el rendimiento
def obtener_todos_los_permisos(
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/permisos**
    
    Obtiene la lista completa de permisos del sistema disponibles.
    """
    # Registrar la dirección IP del cliente y trazas de auditoría de acceso
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de permisos desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La cuenta de usuario se encuentra inactiva.")

    return db.query(Permisos).all()


@router.post("", response_model=PermisoResponse, status_code=status.HTTP_201_CREATED, summary="Crear permiso de seguridad")
@limiter.limit("10/minute") # Protegido frente a la creación masiva o automatizada de permisos
def crear_permiso_seguridad(
    request: Request,
    obj_in: PermisoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.ADMIN_GESTORIA]))
):
    """
    **POST /api/permisos**
    
    Registra un nuevo permiso de seguridad en el sistema validando privilegios administrativos.
    """
    # Registrar metadatos de red y auditoría de la creación
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de permiso desde la IP: {cliente_ip} por el administrador: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La cuenta de usuario se encuentra inactiva.")

    try:
        permiso_existente = db.query(Permisos).filter(Permisos.codigo == obj_in.codigo).first()
        if permiso_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un permiso registrado con el código '{obj_in.codigo}'."
            )

        nuevo_permiso = Permisos(codigo=obj_in.codigo, descripcion=obj_in.descripcion)
        db.add(nuevo_permiso)
        db.commit()
        db.refresh(nuevo_permiso)
        return nuevo_permiso
    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al guardar el permiso: {str(error)}"
        )