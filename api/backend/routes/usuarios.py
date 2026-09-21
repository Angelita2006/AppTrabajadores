from datetime import datetime, timedelta, timezone
from operator import concat
import random
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Security, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.security import oauth2_scheme, get_password_hash, verify_password, crear_token_acceso, obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum, AccionAuditoriaEnum
from core.auditoria import registrar_auditoria
from core.utils import enviar_correo_cambio_contraseña, enviar_correo_cambio_email, enviar_correo_recuperacion
from models.empresas import Empresas
from models.roles import Roles
from schemas.auth import ConfirmarPasswordRequest, EmailCambioRequest, EmailRecuperacionRequest
from schemas.usuarios_roles import UsuarioRolCreate, UsuarioRolResponse
from schemas.usuarios import LoginRequest, UsuarioRegisterCreate, UsuarioResponse
from models.usuarios import Usuarios
from models.trabajadores import Trabajadores
from core.database import get_db
from fastapi.security import OAuth2PasswordRequestForm
from models.usuarios_roles import UsuariosRoles
import secrets


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
        Usuarios.email == form_data.username,
        Usuarios.activo == True,
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


# ==========================================
# RUTAS ESTÁTICAS (DEBEN IR ANTES DE LAS DINÁMICAS)
# ==========================================

@router.get("/me", response_model=UsuarioResponse, summary="Obtener perfil del usuario autenticado")
@limiter.limit("30/minute")
def obtener_mi_usuario(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
) -> UsuarioResponse:
    """
    **GET /api/usuarios/me**
    
    Devuelve los datos completos del usuario que está realizando la petición usando el token de sesión.
    """
    usuario = db.query(Usuarios).options(
        joinedload(Usuarios.empresa),
        joinedload(Usuarios.trabajador),
        joinedload(Usuarios.usuarios_roles)
    ).filter(Usuarios.id == usuario_actual.id).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la información del usuario autenticado."
        )

    return usuario


# ==========================================
# RUTAS DINÁMICAS Y CON PARÁMETROS DE RUTA
# ==========================================

@router.get("/{id_usuario}", response_model=UsuarioResponse, summary="Obtener usuario por ID")
@limiter.limit("30/minute") 
def obtener_usuario_por_id(
    request: Request,
    id_usuario: UUID, 
    token: str = Depends(oauth2_scheme),
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
    token: str = Depends(oauth2_scheme),
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
    token: str = Depends(oauth2_scheme),
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


@router.put("/solicitar-cambio-email", status_code=status.HTTP_200_OK, summary="Solicitar cambio de correo electrónico con verificación")
@limiter.limit("5/minute")
def solicitar_cambio_email(
    request: Request,
    nuevo_email: str,
    background_tasks: BackgroundTasks,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    Valida la unicidad del nuevo correo, genera un token seguro de verificación 
    y envía un enlace al nuevo correo electrónico para confirmar el cambio.
    """
    email_limpio = str(nuevo_email).strip().lower()
    
    email_existente = db.query(Usuarios).filter(
        Usuarios.email == email_limpio,
        Usuarios.id != usuario_actual.id,Usuarios.activo == True
    ).first()
    
    if email_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está en uso por otro usuario."
        )

    token_verificacion = secrets.token_urlsafe(32)
    expiracion = datetime.now(timezone.utc) + timedelta(hours=1)

    setattr(usuario_actual, "email_pendiente_verificacion", email_limpio)
    setattr(usuario_actual, "token_cambio_email", token_verificacion)
    setattr(usuario_actual, "token_cambio_email_expira_at", expiracion)
    setattr(usuario_actual, "updated_at", datetime.now(timezone.utc))
    
    background_tasks.add_task(enviar_correo_cambio_email, email_limpio, token_verificacion)

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=usuario_actual.empresa_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={
            "recurso": "usuarios", 
            "accion": "solicitar_cambio_email", 
            "entidad_id": str(usuario_actual.id), 
            "detalles": f"Solicitud de cambio de email a {email_limpio}"
        }
    )
    
    db.commit()
    db.refresh(usuario_actual)
    
    return {
        "status": "success",
        "message": "Se ha enviado un enlace de confirmación a tu nuevo correo electrónico."
    }


@router.post("/confirmar-cambio-email", status_code=status.HTTP_200_OK, summary="Confirmar cambio de correo electrónico mediante enlace")
def confirmar_cambio_email(
    request: Request,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Endpoint que procesa el clic en el enlace del correo. Valida el token, 
    actualiza el email antiguo por el nuevo en el usuario y en su trabajador asociado, y limpia los campos temporales.
    """
    usuario = db.query(Usuarios).filter(
        Usuarios.token_cambio_email == token
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token de verificación es inválido."
        )

    if usuario.token_cambio_email_expira_at and datetime.now(timezone.utc) > usuario.token_cambio_email_expira_at:
        usuario.token_cambio_email = None
        usuario.token_cambio_email_expira_at = None
        usuario.email_pendiente_verificacion = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de verificación ha expirado. Por favor, solicita uno nuevo desde tu perfil."
        )

    nuevo_email = usuario.email_pendiente_verificacion
    if not nuevo_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay ninguna solicitud de cambio de correo pendiente."
        )

    try:
        usuario.email = nuevo_email
        usuario.email_pendiente_verificacion = None
        usuario.token_cambio_email = None
        usuario.token_cambio_email_expira_at = None
        usuario.updated_at = datetime.now(timezone.utc)

        db.add(usuario)

        trabajador = db.query(Trabajadores).filter(Trabajadores.id == usuario.trabajador_id).first()
        
        if trabajador:
            trabajador.email = nuevo_email
            trabajador.updated_at = datetime.now(timezone.utc)
            db.add(trabajador)

        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario,
            empresa_id=usuario.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                "recurso": "usuarios", 
                "accion": "confirmar_cambio_email", 
                "entidad_id": str(usuario.id), 
                "detalles": f"Email cambiado exitosamente a {nuevo_email} (usuario y trabajador asociado)"
            }
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido completar el cambio de correo electrónico. "+e.__str__()
        )

    return {
        "status": "success",
        "message": "¡Correo electrónico confirmado y actualizado con éxito en tu cuenta y perfil de trabajador!"
    }


@router.put("/solicitar-cambio-password", status_code=status.HTTP_200_OK, summary="Solicitar código para cambio de contraseña")
@limiter.limit("5/minute")
def solicitar_cambio_password(
    request: Request,
    payload: EmailCambioRequest, 
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **POST /api/usuarios/solicitar-cambio-password**
    
    Valida la contraseña actual del usuario autenticado, genera un código aleatorio 
    de 6 dígitos, lo guarda temporalmente y envía un correo electrónico de confirmación.
    """
    if not verify_password(payload.antigua_password, str(usuario_actual.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual introducida no es correcta."
        )

    codigo_aleatorio = f"{random.randint(0, 999999):06d}"

    try:
        usuario_actual.codigo_recuperacion = codigo_aleatorio
        usuario_actual.codigo_expira_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        db.add(usuario_actual)
        db.commit()
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=usuario_actual.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "usuarios", "accion": "solicitar_cambio_password", "entidad_id": str(usuario_actual.id)}
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido procesar la solicitud de cambio de contraseña."
        )

    enviar_correo_cambio_contraseña(usuario_actual.email, codigo_aleatorio)

    return {
        "status": "success",
        "message": "Se ha enviado un código de verificación a tu correo electrónico para confirmar el cambio."
    }


@router.post("/confirmar-cambio-password", status_code=status.HTTP_200_OK, summary="Confirmar nueva contraseña con código")
@limiter.limit("5/minute")
def confirmar_cambio_password(
    request: Request,
    payload: ConfirmarPasswordRequest, 
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **POST /api/usuarios/confirmar-cambio-password**
    
    Valida el código de 6 dígitos recibido por correo y actualiza la contraseña definitivamente.
    """
    if not usuario_actual.codigo_recuperacion or payload.codigo_verificacion != usuario_actual.codigo_recuperacion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de verificación introducido es incorrecto."
        )

    if usuario_actual.codigo_expira_at and datetime.now(timezone.utc) > usuario_actual.codigo_expira_at:
        usuario_actual.codigo_recuperacion = None
        usuario_actual.codigo_expira_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de verificación ha expirado. Solicita uno nuevo."
        )

    if len(payload.nueva_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 6 caracteres."
        )

    try:
        usuario_actual.password_hash = get_password_hash(payload.nueva_password)
        usuario_actual.codigo_recuperacion = None
        usuario_actual.codigo_expira_at = None
        
        if hasattr(usuario_actual, 'updated_at'):
            usuario_actual.updated_at = datetime.now(timezone.utc)
            
        db.add(usuario_actual)
        db.commit()
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=usuario_actual.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "usuarios", "accion": "confirmar_cambio_password", "entidad_id": str(usuario_actual.id)}
        )
        
        return {
            "status": "success",
            "message": "Tu contraseña ha sido actualizada correctamente."
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido actualizar la contraseña: {str(e)}"
        )