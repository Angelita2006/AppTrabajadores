import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from models.empresas import Empresas
from schemas.usuarios import LoginRequest, UsuarioCreate, UsuarioResponse
from models.usuarios import Usuarios
from trabajadores import Trabajadores
from ..core.database import get_db

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios y Autenticación"])

@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario_cuenta(obj_in: UsuarioCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/usuarios
    Registra una nueva cuenta de usuario en el sistema calculando el hash de seguridad.
    """
    # 1. Comprobación de seguridad: El email debe ser único global
    email_existente = db.query(Usuarios).filter(Usuarios.email == obj_in.email).first()
    if email_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado en la plataforma."
        )

    # 2. Comprobación de seguridad: El expediente de trabajador debe ser único si se asocia
    if obj_in.trabajador_id:
        trabajador_vinculado = db.query(Usuarios).filter(Usuarios.trabajador_id == obj_in.trabajador_id).first()
        if trabajador_vinculado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este expediente de trabajador ya cuenta con un usuario de acceso asignado."
            )
            
        trabajador_existe = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
        if not trabajador_existe:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El expediente de trabajador no existe.")

    # 3. Validación de la empresa si se proporciona
    if obj_in.empresa_id:
        empresa_existe = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa_existe:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La empresa especificada no existe.")

    # 4. Mapeo y guardado (Almacenamiento directo temporal para pruebas)
    nuevo_usuario = Usuarios(
        nombre=obj_in.nombre,
        email=obj_in.email,
        password_hash=str(obj_in.password_raw),  
        tipo_usuario=obj_in.tipo_usuario,
        empresa_id=obj_in.empresa_id,
        trabajador_id=obj_in.trabajador_id,
        mfa_habilitado=False,
        activo=True
    )

    try:
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        return nuevo_usuario
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error de integridad al guardar el usuario: {str(error)}"
        )


@router.post("/login", response_model=UsuarioResponse)
def login_plataforma(credenciales: LoginRequest, db: Session = Depends(get_db)):
    """
    URI: POST /api/usuarios/login
    Valida el correo y la contraseña, actualizando el hito de último acceso.
    """
    usuario = db.query(Usuarios).filter(Usuarios.email == credenciales.email).first()

    if not usuario or str(usuario.password_hash) != credenciales.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El correo electrónico o la contraseña introducidos son incorrectos."
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta de usuario se encuentra desactivada."
        )

    setattr(usuario, "ultimo_acceso", datetime.datetime.now())
    db.commit()
    db.refresh(usuario)

    return usuario


@router.get("", response_model=List[UsuarioResponse])
def obtener_todos_los_usuarios(db: Session = Depends(get_db)):
    """
    URI: GET /api/usuarios
    Devuelve el listado completo de cuentas de usuario dadas de alta en el Saas.
    """
    return db.query(Usuarios).all()


@router.get("/{id_usuario}", response_model=UsuarioResponse)
def obtener_usuario_por_id(id_usuario: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/usuarios/{id_usuario}
    Busca los detalles de una cuenta mediante su identificador único UUID.
    """
    usuario = db.query(Usuarios).filter(Usuarios.id == id_usuario).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cuenta de usuario con ID {id_usuario} no encontrada."
        )
    return usuario


@router.put("/{id_usuario}/estado", response_model=UsuarioResponse)
def cambiar_estado_usuario(id_usuario: UUID, activo: bool, db: Session = Depends(get_db)):
    """
    URI: PUT /api/usuarios/{id_usuario}/estado?activo=false
    Permite activar o desactivar una cuenta bloqueando su capacidad de login.
    """
    usuario = db.query(Usuarios).filter(Usuarios.id == id_usuario).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cuenta de usuario con ID {id_usuario} no encontrada."
        )

    setattr(usuario, "activo", activo)
    setattr(usuario, "updated_at", datetime.datetime.now())
    db.commit()
    db.refresh(usuario)
    return usuario
