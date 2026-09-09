import datetime
from operator import concat
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.security import get_password_hash, verify_password, crear_token_acceso, obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from schemas.usuarios import LoginRequest, UsuarioRegisterCreate, UsuarioResponse
from models.usuarios import Usuarios
from models.trabajadores import Trabajadores
from core.database import get_db
from fastapi.security import OAuth2PasswordRequestForm
from models.usuarios_roles import UsuariosRoles

# Configuración del enrutador para la gestión de usuarios y autenticación
router = APIRouter(prefix="/api/usuarios", tags=["Usuarios y Autenticación"])

# Configuración del limitador de tasa de peticiones por IP
limiter = Limiter(key_func=get_remote_address)


@router.post("/registro", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED, summary="Registro inicial de usuario")
@limiter.limit("5/minute") # Limita el registro a un máximo de 5 intentos por minuto para prevenir abusos y spam de cuentas
def registrar_usuario(request: Request, obj_in: UsuarioRegisterCreate, db: Session = Depends(get_db)):
    """
    **POST /api/usuarios/registro**
    
    Busca al trabajador existente mediante la empresa y el NIF, 
    y crea credenciales de usuario vinculadas con contraseña hasheada.
    """
    # 1. Verificar si el correo electrónico ya está registrado en el sistema
    email_existente = db.query(Usuarios).filter(Usuarios.email == obj_in.email).first()
    if email_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado en el sistema."
        )

    # 2. Verificar que la empresa exista a través de su CIF
    empresa = db.query(Empresas).filter(Empresas.cif == obj_in.empresa_cif).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La empresa especificada no existe en el sistema."
        )

    # 3. Comprobar que el trabajador exista en la empresa indicada mediante su NIF/DNI
    trabajador = db.query(Trabajadores).filter(
        Trabajadores.empresa_id == empresa.id,
        Trabajadores.dni_nif_nie == obj_in.dni_nif_nie
    ).first()

    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encuentra ningún trabajador dado de alta con este NIF en la empresa indicada. Contacta con tu administrador."
        )

    # 4. Validar que el trabajador no tenga ya una cuenta de usuario creada
    usuario_existente = db.query(Usuarios).filter(Usuarios.trabajador_id == trabajador.id).first()
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este trabajador ya dispone de una cuenta de usuario registrada."
        )

    # 5. Crear la nueva instancia de usuario con la contraseña cifrada
    nuevo_usuario = Usuarios(
        trabajador_id=trabajador.id,
        empresa_id=empresa.id,
        nombre=concat(concat(trabajador.nombre, " "), trabajador.apellidos),
        email=obj_in.email,
        password_hash=get_password_hash(obj_in.password),
        tipo_usuario=TipoUsuarioEnum.TRABAJADOR
    )

    db.add(nuevo_usuario)
    # Envía los cambios pendientes a la base de datos de manera anticipada para generar el ID del nuevo usuario sin cerrar la transacción principal
    db.flush()

    # 6. Asignar rol por defecto si el trabajador lo tiene definido en su expediente
    if trabajador.rol_id:
        nuevo_usuario_rol = UsuariosRoles(
            usuario_id=nuevo_usuario.id,
            rol_id=trabajador.rol_id,    
            empresa_id=empresa.id
        )
        db.add(nuevo_usuario_rol)

    usuario = db.query(Usuarios).options(
        joinedload(Usuarios.empresa),
        joinedload(Usuarios.trabajador),
        joinedload(Usuarios.usuarios_roles)
    ).filter(Usuarios.id == nuevo_usuario.id).first()

    db.commit()
    db.refresh(usuario)
    
    return usuario


@router.post("/login", summary="Inicio de sesión en la plataforma")
@limiter.limit("5/minute") # Limita los intentos de inicio de sesión a 5 por minuto para mitigar ataques de fuerza bruta
def login_plataforma(request: Request, credenciales: LoginRequest, db: Session = Depends(get_db)):
    """
    **POST /api/usuarios/login**
    
    Autentica a un usuario validando su correo electrónico y contraseña, 
    actualiza su último acceso y genera un token JWT de sesión.
    """
    # Utilizar el objeto request para extraer la IP del cliente y registrar metadatos de acceso si es necesario
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Intento de login desde la IP: {cliente_ip}")

    # 1. Buscar al usuario por correo electrónico
    usuario = db.query(Usuarios).options(
        joinedload(Usuarios.empresa),
        joinedload(Usuarios.trabajador),
        joinedload(Usuarios.usuarios_roles)).filter(Usuarios.email == credenciales.email).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay ningún usuario registrado con ese correo electrónico."
        )

    # 2. Validar la contraseña proporcionada contra el hash almacenado
    if not verify_password(credenciales.password, str(usuario.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La contraseña introducida es incorrecta."
        )

    # 3. Comprobar si la cuenta de usuario se encuentra activa
    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta de usuario se encuentra desactivada."
        )

    # 4. Actualizar la fecha y hora del último acceso exitoso
    setattr(usuario, "ultimo_acceso", datetime.datetime.now())
    db.commit()
    db.refresh(usuario)

    # 5. Generar el token de acceso JWT
    access_token = crear_token_acceso(data={"sub": str(usuario.id), "id": usuario.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": usuario
    }


@router.post("/login-form", summary="Inicio de sesión compatible con Swagger UI")
@limiter.limit("5/minute") # Limita las peticiones del formulario de Swagger para proteger el endpoint contra abusos
def login_para_swagger(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    **POST /api/usuarios/login-form**
    
    Endpoint auxiliar optimizado para autenticación OAuth2 estándar (Swagger UI).
    """
    # Registrar la dirección IP que realiza la petición a través del objeto request
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de login OAuth2 desde IP: {cliente_ip}")

    # Buscar usuario y validar credenciales para el formulario de Swagger
    user = db.query(Usuarios).filter(Usuarios.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credenciales incorrectas o usuario no encontrado."
        )
    
    access_token = crear_token_acceso(data={"sub": user.email, "empresa_id": str(user.empresa_id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/{id_usuario}", response_model=UsuarioResponse, summary="Obtener usuario por ID")
@limiter.limit("30/minute") # Limita las consultas por ID para evitar ataques de enumeración de usuarios
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
    # Registrar la dirección IP que realiza la petición a través del objeto request
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición desde IP: {cliente_ip}")

    # Utilizar el objeto usuario_actual para auditoría o lógica adicional de permisos contextuales
    print(f"El usuario con ID {usuario_actual.id} (Rol: {usuario_actual.tipo_usuario}) ha consultado el perfil {id_usuario}")

    # Verificar si el usuario actual es el propietario o un administrador
    es_admin = usuario_actual.tipo_usuario in [TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]
    if usuario_actual.id != id_usuario and not es_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para ver los datos de otro usuario."
        )

    # Consultar el usuario en la base de datos
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
    return usuario


@router.get("/trabajador/{id_trabajador}", response_model=UsuarioResponse, summary="Obtener usuario por ID de trabajador")
@limiter.limit("30/minute") # Limita las consultas por trabajador para proteger la privacidad de los expedientes
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
    # Registrar la dirección IP que realiza la petición a través del objeto request
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición desde IP: {cliente_ip}")

    # Validar permisos o registrar qué usuario actual realiza la consulta del trabajador
    if usuario_actual.tipo_usuario == TipoUsuarioEnum.TRABAJADOR and usuario_actual.trabajador_id != id_trabajador:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder al expediente de otro trabajador."
        )

    # Buscar el usuario vinculado al ID de trabajador proporcionado
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
    return usuario


@router.put("/{id_usuario}/estado", response_model=UsuarioResponse, summary="Modificar estado de cuenta de usuario")
@limiter.limit("10/minute") # Limita los cambios de estado para prevenir modificaciones masivas no controladas
def cambiar_estado_usuario(
    request: Request,
    id_usuario: UUID, 
    activo: bool, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **PUT /api/usuarios/{id_usuario}/estado?activo=false**
    
    Permite activar o desactivar una cuenta bloqueando su capacidad de login.
    """
    # Registrar la dirección IP que realiza la petición a través del objeto request
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición desde IP: {cliente_ip}")

    # Comprobar mediante usuario_actual quién efectúa la desactivación de cuentas críticas
    print(f"El administrador {usuario_actual.email} está modificando el estado del usuario {id_usuario} a: {activo}")

    # Buscar el usuario a modificar
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

    # Actualizar el estado de activación y la fecha de modificación
    setattr(usuario, "activo", activo)
    setattr(usuario, "updated_at", datetime.datetime.now())
    db.commit()
    db.refresh(usuario)
    return usuario


@router.put("/{id_usuario}/password", response_model=UsuarioResponse, summary="Actualizar contraseña de usuario")
@limiter.limit("5/minute") # Restringe las solicitudes de cambio de contraseña a 5 por minuto para evitar abusos en el sistema de seguridad
def cambiar_password_usuario(
    request: Request,
    id_usuario: UUID, 
    antigua_password: str, 
    nueva_password: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **PUT /api/usuarios/{id_usuario}/password**
    
    Permite cambiar la contraseña validando que el usuario disponga del rol de administración requerido.
    """
    # Registrar la dirección IP que realiza la petición a través del objeto request
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición desde IP: {cliente_ip}")

    # Verificar la identidad del usuario administrador mediante usuario_actual y la IP del request
    print(f"Solicitud de cambio de contraseña para el usuario {id_usuario} autorizada por el admin: {usuario_actual.email}")

    # Buscar el usuario objetivo en la base de datos
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

    # Validar que la contraseña antigua introducida sea correcta
    if not verify_password(antigua_password, str(usuario.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña antigua introducida no es correcta."
        )

    # Actualizar la contraseña con su nuevo hash y la fecha de modificación
    setattr(usuario, "password_hash", get_password_hash(nueva_password))
    setattr(usuario, "updated_at", datetime.datetime.now())

    db.commit()
    db.refresh(usuario)
    
    return usuario