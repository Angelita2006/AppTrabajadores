from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
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

# Configuración del enrutador para la gestión de roles de usuarios
router = APIRouter(prefix="/api/usuarios-roles", tags=["Roles de Usuarios"])

# Configuración del limitador de tasa de peticiones por IP
limiter = Limiter(key_func=get_remote_address)


@router.get("/usuario/{id_usuario}", response_model=List[UsuarioRolResponse], summary="Obtener roles de un usuario")
def obtener_roles_por_usuario(
    request: Request,
    id_usuario: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, 
                TipoUsuarioEnum.ADMIN_EMPRESA, 
                TipoUsuarioEnum.RRHH]))
):
    """
    **GET /api/usuarios-roles/usuario/{id_usuario}**
    
    Permite consultar los roles asignados a un usuario. Los administradores y personal de RRHH 
    pueden consultar cualquier usuario; los usuarios estándar solo pueden consultar sus propios roles.
    """
    # Registrar la dirección IP que realiza la petición a través del objeto request
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición desde IP: {cliente_ip}")

    # Registrar metadatos de auditoría con el usuario actual
    print(f"El usuario con ID {usuario_actual.id} ({usuario_actual.email}) ha consultado los roles del usuario {id_usuario}")

    # 1. Consultar y devolver los roles asignados al usuario especificado
    roles_asignados = db.query(UsuariosRoles).options(
        joinedload(UsuariosRoles.usuario),
        joinedload(UsuariosRoles.rol),
        joinedload(UsuariosRoles.empresa)
    ).filter(UsuariosRoles.usuario_id == id_usuario).all()

    return roles_asignados


@router.post("", response_model=UsuarioRolResponse, status_code=status.HTTP_201_CREATED, summary="Asignar rol a un usuario")
@limiter.limit("10/minute")  # Limita la asignación de roles a un máximo de 10 peticiones por minuto para prevenir modificaciones masivas no autorizadas
def asignar_rol_usuario(
    request: Request,
    obj_in: UsuarioRolCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.ADMIN_GESTORIA]))
):
    """
    **POST /api/usuarios-roles**
    
    Asigna un nuevo rol de seguridad a un usuario dentro de un ámbito empresarial específico.
    """
    # Registrar la dirección IP que realiza la petición a través del objeto request
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de asignación de rol desde IP: {cliente_ip}")

    # Registrar el administrador que ejecuta la acción
    print(f"El administrador {usuario_actual.email} está asignando el rol {obj_in.rol_id} al usuario {obj_in.usuario_id}")

    # 1. Verificar que el usuario receptor exista en el sistema
    usuario = db.query(Usuarios).filter(Usuarios.id == obj_in.usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="El usuario especificado no existe en el sistema."
        )

    # 2. Verificar que el rol de seguridad a asignar exista
    rol = db.query(Roles).filter(Roles.id == obj_in.rol_id).first()
    if not rol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="El rol de seguridad indicado no existe."
        )

    # 3. Validar la existencia de la empresa si se incluye un ámbito empresarial
    if obj_in.empresa_id:
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="La empresa especificada no existe."
            )

    # 4. Comprobar que no exista ya una asignación idéntica para evitar duplicados
    asignacion_existente = db.query(UsuariosRoles).options(
        joinedload(UsuariosRoles.usuario),
        joinedload(UsuariosRoles.rol),
        joinedload(UsuariosRoles.empresa)
    ).filter(
        UsuariosRoles.usuario_id == obj_in.usuario_id,
        UsuariosRoles.rol_id == obj_in.rol_id,
        UsuariosRoles.empresa_id == obj_in.empresa_id
    ).first()

    if asignacion_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este usuario ya cuenta con ese rol asignado dentro del ámbito especificado."
        )

    # 5. Crear la nueva relación de rol de usuario
    nueva_asignacion = UsuariosRoles(
        usuario_id=obj_in.usuario_id,
        rol_id=obj_in.rol_id,
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


@router.put("/{id_asignacion}", response_model=UsuarioRolResponse, status_code=status.HTTP_200_OK, summary="Actualizar asignación de rol")
@limiter.limit("10/minute")  # Restringe la actualización de roles a 10 por minuto para proteger los privilegios del sistema
def actualizar_rol_usuario(
    request: Request,
    id_asignacion: UUID,
    obj_in: UsuarioRolCreate,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.ADMIN_GESTORIA]))
):
    """
    **PUT /api/usuarios-roles/{id_asignacion}**
    
    Modifica una asignación de rol existente para actualizar el usuario, el rol o la empresa vinculada.
    """
    # Registrar la dirección IP que realiza la petición a través del objeto request
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de actualización de rol desde IP: {cliente_ip}")

    # Registrar el administrador que ejecuta la acción
    print(f"El administrador {usuario_actual.email} está actualizando la asignación de rol con ID {id_asignacion}")

    # 1. Buscar la asignación de rol existente que se desea modificar
    asignacion = db.query(UsuariosRoles).options(
        joinedload(UsuariosRoles.usuario),
        joinedload(UsuariosRoles.rol),
        joinedload(UsuariosRoles.empresa)
    ).filter(UsuariosRoles.id == id_asignacion).first()

    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="La asignación de rol que intentas actualizar no existe."
        )

    # 2. Validar la existencia del usuario referenciado
    usuario = db.query(Usuarios).filter(Usuarios.id == obj_in.usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="El usuario especificado no existe en el sistema."
        )

    # 3. Validar la existencia del nuevo rol de seguridad
    rol = db.query(Roles).filter(Roles.id == obj_in.rol_id).first()
    if not rol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="El rol de seguridad indicado no existe."
        )

    # 4. Validar la existencia de la empresa si se proporciona
    if obj_in.empresa_id:
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="La empresa especificada no existe."
            )

    # 5. Comprobar que la modificación no genere un registro duplicado excluyendo el ID actual
    asignacion_existente = db.query(UsuariosRoles).options(
        joinedload(UsuariosRoles.usuario),
        joinedload(UsuariosRoles.rol),
        joinedload(UsuariosRoles.empresa)
    ).filter(
        UsuariosRoles.usuario_id == obj_in.usuario_id,
        UsuariosRoles.rol_id == obj_in.rol_id,
        UsuariosRoles.empresa_id == obj_in.empresa_id,
        UsuariosRoles.id != id_asignacion
    ).first()

    if asignacion_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe otra asignación idéntica para este usuario con este rol y empresa."
        )

    # 6. Actualizar los campos de la asignación de rol
    asignacion.usuario_id = obj_in.usuario_id
    asignacion.rol_id = obj_in.rol_id
    asignacion.empresa_id = obj_in.empresa_id

    try:
        db.commit()
        db.refresh(asignacion)
        return asignacion
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error de integridad al actualizar la asignación del rol: {str(error)}"
        )


@router.delete("/{id_asignacion}", status_code=status.HTTP_200_OK, summary="Revocar rol a un usuario")
def revocar_rol_usuario(
    request: Request,
    id_asignacion: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.ADMIN_GESTORIA]))
):
    """
    **DELETE /api/usuarios-roles/{id_asignacion}**
    
    Elimina por completo una asignación de rol, revocando los permisos asociados al usuario.
    """
    # Registrar la dirección IP que realiza la petición a través del objeto request
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de revocación de rol desde IP: {cliente_ip}")

    # Registrar el administrador que ejecuta la acción
    print(f"El administrador {usuario_actual.email} está revocando la asignación de rol con ID {id_asignacion}")

    # 1. Buscar la asignación de rol que se va a eliminar
    asignacion = db.query(UsuariosRoles).options(
        joinedload(UsuariosRoles.usuario),
        joinedload(UsuariosRoles.rol),
        joinedload(UsuariosRoles.empresa)
    ).filter(UsuariosRoles.id == id_asignacion).first()
    
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="La asignación de rol que intentas revocar no existe."
        )

    # 2. Eliminar la relación de permisos de la base de datos
    db.delete(asignacion)
    db.commit()
    return {"detail": f"Rol revocado correctamente. Asignación con ID {id_asignacion} eliminada."}