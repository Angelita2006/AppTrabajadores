from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.database import get_db
from core.security import obtener_usuario_actual
from models.permisos import Permisos
from models.usuarios import Usuarios
from schemas.permisos import PermisoCreate, PermisoResponse

router = APIRouter(prefix="/api/permisos", tags=["Permisos del Sistema"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=PermisoResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")  # Protegido frente a la creación masiva no deseada de permisos de seguridad
def crear_permiso_seguridad(
    request: Request,
    obj_in: PermisoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/permisos
    Registra una nueva capacidad o permiso en la plataforma Saas. 
    Exclusivo para administradores activos.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    if usuario_actual.tipo_usuario != "Administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren privilegios de administrador para registrar nuevos permisos de seguridad."
        )

    try:
        permiso_existente = db.query(Permisos).filter(Permisos.codigo == obj_in.codigo).first()
        if permiso_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un permiso registrado con el código identificador '{obj_in.codigo}'."
            )

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
def obtener_todos_los_permisos(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/permisos
    Devuelve el catálogo de capacidades y llaves de acceso global bajo autenticación activa.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    return db.query(Permisos).all()


@router.get("/{id_permiso}", response_model=PermisoResponse)
def obtener_permiso_por_id(
    id_permiso: int, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/permisos/{id_permiso}
    Busca las características de un permiso utilizando su identificador numérico de forma protegida.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    permiso = db.query(Permisos).filter(Permisos.id == id_permiso).first()
    if not permiso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Permiso de seguridad con ID {id_permiso} no encontrado en el sistema."
        )
    return permiso


@router.get("/codigo/{codigo_slug}", response_model=PermisoResponse)
def obtener_permiso_por_codigo(
    codigo_slug: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/permisos/codigo/{codigo_slug}
    Busca una llave de control específica mediante su código único o slug bajo autenticación activa.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    permiso = db.query(Permisos).filter(Permisos.codigo == codigo_slug).first()
    if not permiso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna regla registrada bajo el código '{codigo_slug}'."
        )
    return permiso