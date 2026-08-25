from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from models.roles import Roles
from schemas.usuarios_roles import UsuarioRolCreate, UsuarioRolResponse
from models.usuarios import Usuarios
from models.usuarios_roles import UsuariosRoles

router = APIRouter(prefix="/api/usuarios-roles", tags=["Roles de Usuarios"])
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=UsuarioRolResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def asignar_rol_usuario(
    request: Request,
    obj_in: UsuarioRolCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.ADMIN_GESTORIA]))
):
    # 1. Validaciones de existencia
    usuario = db.query(Usuarios).filter(Usuarios.id == obj_in.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    rol = db.query(Roles).filter(Roles.id == obj_in.role_id).first()
    if not rol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol de seguridad no encontrado.")

    if obj_in.empresa_id:
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada.")

    # 2. Comprobación de unicidad
    asignacion_existente = db.query(UsuariosRoles).filter(
        UsuariosRoles.usuario_id == obj_in.usuario_id,
        UsuariosRoles.role_id == obj_in.role_id,
        UsuariosRoles.empresa_id == obj_in.empresa_id
    ).first()

    if asignacion_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este usuario ya cuenta con ese rol asignado dentro del ámbito especificado."
        )

    nueva_asignacion = UsuariosRoles(
        usuario_id=obj_in.usuario_id,
        role_id=obj_in.role_id,
        empresa_id=obj_in.empresa_id
    )

    try:
        db.add(nueva_asignacion)
        db.commit()
        db.refresh(nueva_asignacion)
        return nueva_asignacion
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error de integridad al consolidar el rol del usuario: {str(error)}"
        )

@router.delete("/{id_asignacion}", status_code=status.HTTP_200_OK)
def revocar_rol_usuario(
    id_asignacion: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.ADMIN_GESTORIA]))
):
    asignacion = db.query(UsuariosRoles).filter(UsuariosRoles.id == id_asignacion).first()
    if not asignacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación de rol no encontrada.")

    db.delete(asignacion)
    db.commit()
    return {"detail": f"Rol revocado correctamente. Asignación ({id_asignacion}) eliminada."}


@router.get("", response_model=List[UsuarioRolResponse])
def obtener_todas_las_asignaciones_de_roles(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.ADMIN_GESTORIA]))
):
    return db.query(UsuariosRoles).join(UsuariosRoles.usuario).order_by(Usuarios.nombre.asc()).all()

@router.get("/usuario/{id_usuario}", response_model=List[UsuarioRolResponse])
def obtener_roles_por_usuario(
    id_usuario: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    if usuario_actual.id != id_usuario:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No estás autorizado para consultar los roles de otro usuario."
        )
    return db.query(UsuariosRoles).filter(UsuariosRoles.usuario_id == id_usuario).all()
