from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.roles import Roles
from models.usuarios import Usuarios
from schemas.roles import RolCreate, RolResponse

router = APIRouter(prefix="/api/roles", tags=["Roles del Sistema"])
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=RolResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def crear_rol_seguridad(
    request: Request,
    obj_in: RolCreate, 
    db: Session = Depends(get_db),
    # Protegido: Solo administradores de empresa o gestoría pueden crear nuevos roles
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.ADMIN_GESTORIA]))
):
    try:
        rol_existente = db.query(Roles).filter(Roles.nombre == obj_in.nombre).first()
        if rol_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un rol registrado con el nombre '{obj_in.nombre}'."
            )

        nuevo_rol = Roles(nombre=obj_in.nombre, descripcion=obj_in.descripcion)
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

@router.get("/empresa/{empresa_id}", response_model=List[RolResponse])
def obtener_roles_empresa(
    empresa_id: str,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
        URI: GET /api/roles/empresa/{empresa_id}
        Obtiene los roles de la empresa por su id.
        """
    if not usuario_actual.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta inactiva.")

    return db.query(Roles).filter(Roles.empresa_id == empresa_id).all()

@router.get("/{id_rol}", response_model=RolResponse)
def obtener_rol_por_id(
    id_rol: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
            URI: GET /api/roles/{id_rol}
            Obtiene un rol por su id.
            """
    if not usuario_actual.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta inactiva.")
    rol = db.query(Roles).filter(Roles.id == id_rol).first()
    if not rol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado.")
    return rol