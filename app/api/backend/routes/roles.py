from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from models.roles import Roles
from schemas.roles import RolCreate, RolResponse

router = APIRouter(prefix="/api/roles", tags=["Roles del Sistema"])

@router.post("", response_model=RolResponse, status_code=status.HTTP_201_CREATED)
def crear_rol_seguridad(obj_in: RolCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/roles
    Registra un nuevo rol dentro del catálogo maestro de la plataforma Saas.
    """
    try:
        # 1. Comprobación de la restricción de unicidad del nombre para evitar duplicidades
        rol_existente = db.query(Roles).filter(Roles.nombre == obj_in.nombre).first()
        if rol_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un rol registrado con el nombre '{obj_in.nombre}'."
            )

        # 2. Mapea los datos del esquema directamente al modelo físico de la base de datos (SmallInteger)
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
def obtener_todos_los_roles(db: Session = Depends(get_db)):
    """
    URI: GET /api/roles
    Devuelve el catálogo completo de roles de seguridad definidos en el sistema.
    """
    return db.query(Roles).order_by(Roles.id.asc()).all()


@router.get("/{id_rol}", response_model=RolResponse)
def obtener_rol_por_id(id_rol: int, db: Session = Depends(get_db)):
    """
    URI: GET /api/roles/{id_rol}
    Busca las características de un rol específico utilizando su identificador numérico entero (SmallInteger).
    """
    rol = db.query(Roles).filter(Roles.id == id_rol).first()
    if not rol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rol con ID {id_rol} no encontrado en la plataforma."
        )
    return rol
