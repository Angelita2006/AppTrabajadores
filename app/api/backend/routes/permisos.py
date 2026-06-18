from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from permisos import Permisos
from schemas.permisos import PermisoCreate, PermisoResponse

router = APIRouter(prefix="/api/permisos", tags=["Permisos del Sistema"])

@router.post("", response_model=PermisoResponse, status_code=status.HTTP_201_CREATED)
def crear_permiso_seguridad(obj_in: PermisoCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/permisos
    Registra una nueva capacidad o permiso en la plataforma Saas para la matriz de seguridad de accesos.
    """
    try:
        # 1. Comprobación de la restricción de unicidad del código slug para evitar duplicidades
        permiso_existente = db.query(Permisos).filter(Permisos.codigo == obj_in.codigo).first()
        if permiso_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un permiso registrado con el código identificador '{obj_in.codigo}'."
            )

        # 2. Mapea los datos del esquema directamente al modelo físico de la base de datos (SmallInteger)
        nuevo_permiso = Permisos(
            codigo=obj_in.codigo,
            descripcion=obj_in.descripcion
        )
        
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
            detail=f"Ha ocurrido un error de integridad al guardar el permiso: {str(error)}"
        )


@router.get("", response_model=List[PermisoResponse])
def obtener_todos_los_permisos(db: Session = Depends(get_db)):
    """
    URI: GET /api/permisos
    Devuelve el catálogo de capacidades y llaves de acceso global del sistema Saas.
    """
    return db.query(Permisos).all()


@router.get("/{id_permiso}", response_model=PermisoResponse)
def obtener_permiso_por_id(id_permiso: int, db: Session = Depends(get_db)):
    """
    URI: GET /api/permisos/{id_permiso}
    Busca las características de un permiso utilizando su identificador numérico entero (SmallInteger).
    """
    permiso = db.query(Permisos).filter(Permisos.id == id_permiso).first()
    if not permiso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Permiso de seguridad con ID {id_permiso} no encontrado en el sistema."
        )
    return permiso


@router.get("/codigo/{codigo_slug}", response_model=PermisoResponse)
def obtener_permiso_por_codigo(codigo_slug: str, db: Session = Depends(get_db)):
    """
    URI: GET /api/permisos/codigo/{codigo_slug}
    Busca una llave de control específica mediante su código único o slug de seguridad (Ej: 'fichajes.fichar').
    """
    permiso = db.query(Permisos).filter(Permisos.codigo == codigo_slug).first()
    if not permiso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna regla registrada bajo el código '{codigo_slug}'."
        )
    return permiso
