from datetime import datetime
from operator import concat
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.security import get_password_hash, verify_password, crear_token_acceso, obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum, AccionAuditoriaEnum
from core.auditoria import registrar_auditoria
from models.empresas import Empresas
from models.roles import Roles
from schemas.usuarios_roles import UsuarioRolCreate, UsuarioRolResponse
from schemas.usuarios import LoginRequest, UsuarioRegisterCreate, UsuarioResponse
from models.usuarios import Usuarios
from models.trabajadores import Trabajadores
from core.database import get_db
from fastapi.security import OAuth2PasswordRequestForm
from models.usuarios_roles import UsuariosRoles

# Configuración del enrutador para la gestión de usuarios
router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])

# Configuración del limitador de tasa de peticiones por IP
limiter = Limiter(key_func=get_remote_address)

@router.post("/registro", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED, summary="Registro inicial de usuario")
@limiter.limit("5/minute")
def registrar_usuario(request: Request, obj_in: UsuarioRegisterCreate, db: Session = Depends(get_db)):
    """
    **POST /api/usuarios/registro**
    
    Busca al trabajador existente mediante la empresa y el NIF, 
    y crea credenciales de usuario vinculadas con contraseña hasheada.
    """
    email_limpio = str(obj_in.email).strip().lower()
    email_existente = db.query(Usuarios).filter(
        Usuarios.email == email_limpio,
        Usuarios.activo.is_(True),
    ).first()
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
        Trabajadores.dni_nif_nie == obj_in.dni_nif_nie,
        Trabajadores.activo.is_(True),
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
        empresa_id=empresa.id,
        nombre=concat(concat(trabajador.nombre, " "), trabajador.apellidos),
        email=email_limpio,
        password_hash=get_password_hash(obj_in.password),
        tipo_usuario=TipoUsuarioEnum.TRABAJADOR
    )

    db.add(nuevo_usuario)
    db.flush()

    if trabajador.rol_id:
        nuevo_usuario_rol = UsuariosRoles(
            usuario_id=nuevo_usuario.id,
            rol_id=trabajador.rol_id,    
            empresa_id=empresa.id
        )
        db.add(nuevo_usuario_rol)

    registrar_auditoria(
        db=db,
        request=request,
        usuario=nuevo_usuario,
        empresa_id=empresa.id,
        accion=AccionAuditoriaEnum.CREACION,
        detalle={"recurso": "usuarios", "accion": "registro", "entidad_id": str(nuevo_usuario.id), "detalles": f"Registro inicial del usuario {nuevo_usuario.email}"}
    )

    db.commit()

    usuario = db.query(Usuarios).options(
        joinedload(Usuarios.empresa),
        joinedload(Usuarios.trabajador),
        joinedload(Usuarios.usuarios_roles)
    ).filter(Usuarios.id == nuevo_usuario.id).first()
    
    db.refresh(usuario)
    return usuario


@router.post("/login", summary="Inicio de sesión en la plataforma")
@limiter.limit("5/minute")
def login_plataforma(request: Request, credenciales: LoginRequest, db: Session = Depends(get_db)):
    """
    **POST /api/usuarios/login**
    
    Autentica a un usuario validando su correo electrónico y contraseña, 
    actualiza su último acceso y genera un token JWT de sesión.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Intento de login desde la IP: {cliente_ip}")

    usuario = db.query(Usuarios).options(
        joinedload(Usuarios.empresa),
        joinedload(Usuarios.trabajador),
        joinedload(Usuarios.usuarios_roles)).filter(
            Usuarios.email == str(credenciales.email).strip().lower(),
            Usuarios.activo.is_(True),
        ).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay ningún usuario registrado con ese correo electrónico."
        )

    if not verify_password(credenciales.password, str(usuario.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La contraseña introducida es incorrecta."
        )

    setattr(usuario, "ultimo_acceso", datetime.now())
    
    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario,
        empresa_id=usuario.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "usuarios", "accion": "login", "entidad_id": str(usuario.id), "detalles": f"Inicio de sesión exitoso de {usuario.email}"}
    )
    db.commit()
    db.refresh(usuario)

    access_token = crear_token_acceso(data={"sub": str(usuario.id), "id": usuario.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": usuario
    }


@router.post("/login-form", summary="Inicio de sesión compatible con Swagger UI")
@limiter.limit("5/minute")
def login_para_swagger(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    **POST /api/usuarios/login-form**
    
    Endpoint auxiliar optimizado para autenticación OAuth2 estándar (Swagger UI).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de login OAuth2 desde IP: {cliente_ip}")

    user = db.query(Usuarios).filter(
        Usuarios.email == form_data.username.strip().lower(),
        Usuarios.activo.is_(True),
    ).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credenciales incorrectas o usuario no encontrado."
        )
    
    registrar_auditoria(
        db=db,
        request=request,
        usuario=user,
        empresa_id=user.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "usuarios", "accion": "login_swagger", "entidad_id": str(user.id), "detalles": f"Inicio de sesión vía Swagger de {user.email}"}
    )
    db.commit()

    access_token = crear_token_acceso(data={"sub": user.email, "empresa_id": str(user.empresa_id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/{id_usuario}", response_model=UsuarioResponse, summary="Obtener usuario por ID")
@limiter.limit("30/minute") 
def obtener_usuario_por_id(
    request: Request,
    id_usuario: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/usuarios/{id_usuario}**
    
    Busca los detalles de una cuenta mediante su identificador único UUID de forma protegida.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición desde IP: {cliente_ip}")
    print(f"El usuario con ID {usuario_actual.id} (Rol: {usuario_actual.tipo_usuario}) ha consultado el perfil {id_usuario}")

    es_admin = usuario_actual.tipo_usuario in [TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]
    if usuario_actual.id != id_usuario and not es_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para ver los datos de otro usuario."
        )

    usuario = db.query(Usuarios).options(
        joinedload(Usuarios.empresa),
        joinedload(Usuarios.trabajador),
        joinedload(Usuarios.usuarios_roles)
    ).filter(Usuarios.id == id_usuario).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cuenta de usuario con ID {id_usuario} no encontrada."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=usuario.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "usuarios", "accion": "obtener_por_id", "entidad_id": str(id_usuario), "detalles": f"Consulta de perfil de usuario {id_usuario}"}
    )
    db.commit()

    return usuario


@router.get("/trabajador/{id_trabajador}", response_model=UsuarioResponse, summary="Obtener usuario por ID de trabajador")
@limiter.limit("30/minute")
def obtener_usuario_por_id_trabajador(
    request: Request,
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
) -> UsuarioResponse:
    """
    **GET /api/usuarios/trabajador/{id_trabajador}**
    
    Devuelve la cuenta de usuario asociada a un expediente de trabajador bajo autenticación.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición desde IP: {cliente_ip}")

    if usuario_actual.tipo_usuario == TipoUsuarioEnum.TRABAJADOR and usuario_actual.trabajador_id != id_trabajador:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder al expediente de otro trabajador."
        )

    usuario = db.query(Usuarios).options(
        joinedload(Usuarios.empresa),
        joinedload(Usuarios.trabajador),
        joinedload(Usuarios.usuarios_roles)
    ).filter(Usuarios.trabajador_id == id_trabajador).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró una cuenta de usuario asociada al expediente de trabajador con ID {id_trabajador}."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=usuario.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "usuarios", "accion": "obtener_por_trabajador", "entidad_id": str(usuario.id), "detalles": f"Consulta de usuario por trabajador {id_trabajador}"}
    )
    db.commit()

    return usuario


@router.put("/{id_usuario}/estado", response_model=UsuarioResponse, summary="Modificar estado de cuenta de usuario")
@limiter.limit("10/minute")
def cambiar_estado_usuario(
    request: Request,
    id_usuario: UUID, 
    activo: bool, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/usuarios/{id_usuario}/estado?activo=false**
    
    Permite activar o desactivar una cuenta bloqueando su capacidad de login.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición desde IP: {cliente_ip}")
    print(f"El administrador {usuario_actual.email} está modificando el estado del usuario {id_usuario} a: {activo}")

    usuario = db.query(Usuarios).options(
        joinedload(Usuarios.empresa),
        joinedload(Usuarios.trabajador),
        joinedload(Usuarios.usuarios_roles)
    ).filter(Usuarios.id == id_usuario).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cuenta de usuario con ID {id_usuario} no encontrada."
        )

    setattr(usuario, "activo", activo)
    setattr(usuario, "updated_at", datetime.now())

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=usuario.empresa_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={"recurso": "usuarios", "accion": "cambiar_estado", "entidad_id": str(id_usuario), "detalles": f"Cambio de estado del usuario {id_usuario} a activo={activo}"}
    )
    db.commit()
    db.refresh(usuario)
    return usuario


@router.put("/{id_usuario}/password", response_model=UsuarioResponse, summary="Actualizar contraseña de usuario")
@limiter.limit("5/minute") 
def cambiar_password_usuario(
    request: Request,
    id_usuario: UUID, 
    antigua_password: str, 
    nueva_password: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **PUT /api/usuarios/{id_usuario}/password**
    
    Permite cambiar la contraseña validando que el usuario disponga del rol de administración requerido.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición desde IP: {cliente_ip}")
    print(f"Solicitud de cambio de contraseña para el usuario {id_usuario} autorizada por el admin: {usuario_actual.email}")

    usuario = db.query(Usuarios).options(
        joinedload(Usuarios.empresa),
        joinedload(Usuarios.trabajador),
        joinedload(Usuarios.usuarios_roles)
    ).filter(Usuarios.id == id_usuario).first()

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
    setattr(usuario, "updated_at", datetime.now())

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=usuario.empresa_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={"recurso": "usuarios", "accion": "cambiar_password", "entidad_id": str(id_usuario), "detalles": f"Cambio de contraseña para el usuario {id_usuario}"}
    )
    db.commit()
    db.refresh(usuario)
    
    return usuario