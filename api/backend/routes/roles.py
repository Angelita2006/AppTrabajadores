from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.database import get_db
from core.security import obtener_usuario_actual
from models.roles import Roles
from models.usuarios import Usuarios
from schemas.roles import RolCreate, RolResponse

router = APIRouter(prefix="/api/roles", tags=["Roles del Sistema"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=RolResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")  # Protegido frente a la creación masiva no deseada de roles de seguridad
def crear_rol_seguridad(
    request: Request,
    obj_in: RolCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/roles
    Registra un nuevo rol dentro del catálogo maestro de la plataforma Saas.
    Exclusivo para administradores.
    """
    if usuario_actual.tipo_usuario != "Administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren privilegios de administrador para registrar nuevos roles en el sistema."
        )

    try:
        rol_existente = db.query(Roles).filter(Roles.nombre == obj_in.nombre).first()
        if rol_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un rol registrado con el nombre '{obj_in.nombre}'."
            )

        nuevo_rol = Roles(
            nombre=obj_in.nombre,
            descripcion=obj_in.descripcion
        )
        
        db.add(nuevo_rol)
        db.commit()
        db.refresh(nuevo_rol)
        return nuevo_rol

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error de integridad al guardar el rol: {str(error)}"
        )


@router.get("", response_model=List[RolResponse])
def obtener_todos_los_roles(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/roles
    Devuelve el catálogo completo de roles de seguridad definidos bajo autenticación obligatoria.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    return db.query(Roles).order_by(Roles.id.asc()).all()


@router.get("/{id_rol}", response_model=RolResponse)
def obtener_rol_por_id(
    id_rol: int, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/roles/{id_rol}
    Busca las características de un rol específico utilizando su identificador numérico de forma protegida.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    rol = db.query(Roles).filter(Roles.id == id_rol).first()
    if not rol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rol con ID {id_rol} no encontrado en la plataforma."
        )
    return rol