from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from core.database import get_db
from models.empresas import Empresas
from models.roles import Roles
from schemas.usuarios_roles import UsuarioRolCreate, UsuarioRolResponse
from models.usuarios import Usuarios
from models.usuarios_roles import UsuariosRoles

router = APIRouter(prefix="/api/usuarios-roles", tags=["Roles de Usuarios"])

@router.post("", response_model=UsuarioRolResponse, status_code=status.HTTP_201_CREATED)
def asignar_rol_usuario(obj_in: UsuarioRolCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/usuarios-roles
    Vincula un rol específico a una cuenta de usuario, delimitando su ámbito de actuación (tenant).
    """
    # 1. Validaciones estructurales básicas de existencia
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

    # 2. Comprobación de la restricción de unicidad compuesta 
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

    # 3. Mapeo y volcado directo al modelo físico (el ID lo genera la base de datos de forma nativa)
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


@router.get("", response_model=List[UsuarioRolResponse])
def obtener_todas_las_asignaciones_de_roles(db: Session = Depends(get_db)):
    """
    URI: GET /api/usuarios-roles
    Devuelve la matriz global de asignaciones de roles y alcances del sistema Saas.
    """
    return db.query(UsuariosRoles).join(UsuariosRoles.usuario).order_by(Usuarios.nombre.asc()).all()


@router.get("/usuario/{id_usuario}", response_model=List[UsuarioRolResponse])
def obtener_roles_por_usuario(id_usuario: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/usuarios-roles/usuario/{id_usuario}
    Recupera la lista de perfiles y empresas vinculadas a una cuenta de usuario específica.
    """
    return db.query(UsuariosRoles).filter(UsuariosRoles.usuario_id == id_usuario).all()

@router.put("/{id_usuario}/rol", response_model=UsuarioRolResponse)
def cambiar_rol_asignado_usuario(id_usuario: UUID, nuevo_rol: int, db: Session = Depends(get_db)):
    """
    URI: PUT /api/usuarios-roles/{id_usuario}/rol
    Modifica el rol asignado a un usuario existente.
    """
    usuariorol = db.query(UsuariosRoles).filter(UsuariosRoles.usuario_id == id_usuario).first()
    
    if not usuariorol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna asignación de rol con el ID de usuario {id_usuario}."
        )
    
    setattr(usuariorol, "role_id", nuevo_rol)
    # setattr(usuariorol, "updated_at", datetime.now())
    
    db.commit()
    db.refresh(usuariorol)
    return usuariorol

@router.delete("/{id_asignacion}", status_code=status.HTTP_200_OK)
def revocar_rol_usuario(id_asignacion: UUID, db: Session = Depends(get_db)):
    """
    URI: DELETE /api/usuarios-roles/{id_asignacion}
    Elimina físicamente una asignación de rol, revocando el permiso específico del usuario.
    """
    asignacion = db.query(UsuariosRoles).filter(UsuariosRoles.id == id_asignacion).first()
    if not asignacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación de rol no encontrada.")

    db.delete(asignacion)
    db.commit()
    return {"detail": f"Rol revocado correctamente. Asignación ({id_asignacion}) eliminada."}
