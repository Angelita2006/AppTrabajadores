from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.permisos import Permisos
from models.usuarios import Usuarios
from schemas.permisos import PermisoCreate, PermisoResponse

router = APIRouter(prefix="/api/permisos", tags=["Permisos del Sistema"])
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=PermisoResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def crear_permiso_seguridad(
    request: Request,
    obj_in: PermisoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.ADMIN_GESTORIA]))
):
    try:
        if not usuario_actual.activo:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta inactiva.")

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

@router.get("", response_model=List[PermisoResponse])
def obtener_todos_los_permisos(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    if not usuario_actual.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta inactiva.")
    return db.query(Permisos).all()