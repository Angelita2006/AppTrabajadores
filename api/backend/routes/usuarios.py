import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.security import get_password_hash, verify_password, crear_token_acceso, obtener_usuario_actual
from models.empresas import Empresas
from schemas.usuarios import LoginRequest, UsuarioCreate, UsuarioRegisterCreate, UsuarioResponse
from models.usuarios import Usuarios
from models.trabajadores import Trabajadores
from core.database import get_db
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends, status, HTTPException

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios y Autenticación"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario_cuenta(
    obj_in: UsuarioCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/usuarios
    Registra una nueva cuenta de usuario en el sistema aplicando hash seguro a la contraseña.
    Requiere autenticación previa de administrador.
    """
    if usuario_actual.tipo_usuario != "Administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear cuentas de usuario directamente."
        )

    email_existente = db.query(Usuarios).filter(Usuarios.email == obj_in.email).first()
    if email_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado en la plataforma."
        )

    if obj_in.trabajador_id:
        trabajador_vinculado = db.query(Usuarios).filter(Usuarios.trabajador_id == obj_in.trabajador_id).first()
        if trabajador_vinculado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este expediente de trabajador ya cuenta con un usuario de acceso asignado."
            )
            
        trabajador_existe = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
        if not trabajador_existe:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El expediente de trabajador não existe.")

    if obj_in.empresa_id:
        empresa_existe = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa_existe:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La empresa especificada no existe.")

    nuevo_usuario = Usuarios(
        nombre=obj_in.nombre,
        email=obj_in.email,
        password_hash=get_password_hash(obj_in.password_raw),  
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


@router.post("/registro", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")  # Protegido contra spam de registros y bots
def registrar_usuario(request: Request, obj_in: UsuarioRegisterCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/usuarios/registro
    Busca al trabajador existente mediante la empresa y el NIF, 
    y crea credenciales de usuario vinculadas con contraseña hasheada.
    """
    email_existente = db.query(Usuarios).filter(Usuarios.email == obj_in.email).first()
    if email_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado en el sistema."
        )

    empresa = db.query(Empresas).filter(Empresas.cif == obj_in.empresa_cif).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La empresa especificada no existe en el sistema."
        )

    trabajador = db.query(Trabajadores).filter(
        Trabajadores.empresa_id == empresa.id,
        Trabajadores.nif_nie == obj_in.nif_nie
    ).first()

    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encuentra ningún trabajador dado de alta con este NIF en la empresa indicada. Contacta con tu administrador."
        )

    usuario_existente = db.query(Usuarios).filter(Usuarios.trabajador_id == trabajador.id).first()
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este trabajador ya dispone de una cuenta de usuario registrada."
        )

    nuevo_usuario = Usuarios(
        trabajador_id=trabajador.id,
        nombre=trabajador.nombre,
        email=obj_in.email,
        password_hash=get_password_hash(obj_in.password),
        tipo_usuario="Trabajador"
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    
    return nuevo_usuario


@router.post("/login")
@limiter.limit("5/minute")  # Protegido estrictamente contra ataques de fuerza bruta
def login_plataforma(request: Request, credenciales: LoginRequest, db: Session = Depends(get_db)):
    """
    URI: POST /api/usuarios/login
    Valida el correo y la contraseña exclusivamente mediante hash seguro, 
    actualiza el último acceso y emite un token JWT Bearer.
    """
    usuario = db.query(Usuarios).filter(Usuarios.email == credenciales.email).first()

    if not usuario or not verify_password(credenciales.password, str(usuario.password_hash)):
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

    access_token = crear_token_acceso(data={"sub": str(usuario.id), "id": usuario.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": usuario
    }


@router.get("", response_model=List[UsuarioResponse])
def obtener_todos_los_usuarios(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/usuarios
    Devuelve el listado completo de cuentas de usuario. Solo accesible por administradores.
    """
    if usuario_actual.tipo_usuario != "Administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos suficientes para listar todos los usuarios."
        )
    return db.query(Usuarios).order_by(Usuarios.nombre.asc()).all()

@router.post("/login-form")
def login_para_swagger(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Swagger envía el email en el campo 'username' del formulario
    user = db.query(Usuarios).filter(Usuarios.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credenciales incorrectas"
        )
    
    # Aquí generas tu token JWT con la misma lógica que usas en tu login normal
    access_token = crear_token_acceso(data={"sub": user.email, "empresa_id": str(user.empresa_id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/{id_usuario}", response_model=UsuarioResponse)
def obtener_usuario_por_id(
    id_usuario: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/usuarios/{id_usuario}
    Busca los detalles de una cuenta mediante su identificador único UUID de forma protegida.
    """
    if usuario_actual.id != id_usuario and usuario_actual.tipo_usuario != "Administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para ver los datos de otro usuario."
        )

    usuario = db.query(Usuarios).filter(Usuarios.id == id_usuario).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cuenta de usuario con ID {id_usuario} no encontrada."
        )
    return usuario


@router.put("/{id_usuario}/estado", response_model=UsuarioResponse)
def cambiar_estado_usuario(
    id_usuario: UUID, 
    activo: bool, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: PUT /api/usuarios/{id_usuario}/estado?activo=false
    Permite activar o desactivar una cuenta bloqueando su capacidad de login.
    """
    if usuario_actual.tipo_usuario != "Administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren privilegios de administrador para modificar el estado de las cuentas."
        )

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


@router.put("/{id_usuario}/password", response_model=UsuarioResponse)
@limiter.limit("5/minute")  # Protegido para evitar ataques de adivinación de contraseñas antiguas
def cambiar_password_usuario(
    request: Request,
    id_usuario: UUID, 
    antigua_password: str, 
    nueva_password: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: PUT /api/usuarios/{id_usuario}/password
    Permite cambiar la contraseña validando que el usuario modifique su propia cuenta o sea admin.
    """
    if usuario_actual.id != id_usuario and usuario_actual.tipo_usuario != "Administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No estás autorizado para modificar la contraseña de otro usuario."
        )
        
    usuario = db.query(Usuarios).filter(Usuarios.id == id_usuario).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cuenta de usuario con ID {id_usuario} no encontrada."
        )

    if not verify_password(antigua_password, str(usuario.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña antigua introducida no es correcta."
        )

    setattr(usuario, "password_hash", get_password_hash(nueva_password))
    setattr(usuario, "updated_at", datetime.datetime.now())
    db.commit()
    db.refresh(usuario)
    return usuario


@router.get("/trabajador/{id_trabajador}", response_model=UsuarioResponse)
def get_usuario_por_id_trabajador(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
) -> UsuarioResponse:
    """
    URI: GET /api/usuarios/trabajador/{id_trabajador}
    Devuelve la cuenta de usuario asociada a un expediente de trabajador bajo autenticación.
    """
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.trabajador_id != id_trabajador:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para consultar este expediente."
        )

    usuario = db.query(Usuarios).filter(Usuarios.trabajador_id == id_trabajador).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró una cuenta de usuario asociada al expediente de trabajador con ID {id_trabajador}."
        )
    return usuario