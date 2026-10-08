import datetime
import bcrypt
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from core.database import get_db
from core.config import settings
from models.usuarios import Usuarios
from models.usuarios_empresas import UsuariosEmpresas
from models.roles import Roles

# Claves de configuración para los tokens JWT
SECRET_KEY = settings.SECRET_KEY.__str__()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 

# Esquema de autenticación OAuth2 para FastAPI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/usuarios/login-form")

def get_password_hash(password: str) -> str:
    """
    Toma una contraseña en texto plano, la convierte a bytes,
    genera un salt automático y devuelve el hash encriptado como string.
    Nota: bcrypt trunca automáticamente las contraseñas que superen los 72 bytes.
    """
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    return hashed_bytes.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compara la contraseña en texto plano del login contra el hash de la base de datos.
    Devuelve True si coinciden, manejando correctamente la conversión de tipos y excepciones.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def crear_token_acceso(data: dict) -> str:
    """
    Genera un token JWT firmado digitalmente con una fecha de expiración en UTC consciente.
    Se recomienda inyectar dentro de 'data' campos clave como:
    sub (user_id o email), empresa_id, etc.
    """
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def obtener_usuario_actual(
    request: Request,
    db: Session = Depends(get_db)
) -> Usuarios:
    """
    Dependencia de FastAPI para proteger rutas. 
    Busca el token primero en el Header (Authorization: Bearer ...) 
    y si no lo encuentra, lo busca en los parámetros de la URL (?token=...).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se han podido validar las credenciales de acceso.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = None

    # 1. Intentar obtener el token de la cabecera HTTP
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]

    # 2. Si no está en el header, buscar en los parámetros de la URL (?token=...)
    if not token:
        token = request.query_params.get("token")

    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_email_raw = payload.get("sub")
        if not isinstance(user_email_raw, str):
            raise credentials_exception
        user_id = user_email_raw
    except JWTError:
        raise credentials_exception

    if "@" in user_id: 
        usuario = db.query(Usuarios).filter(Usuarios.email == user_id, Usuarios.activo.is_(True)).first()
    else:
        usuario = db.query(Usuarios).filter(Usuarios.id == user_id).first()    
        
    if usuario is None or not usuario.activo:
        raise credentials_exception
        
    return usuario

def verificar_rol_requerido(roles_permitidos: list[str]):
    """
    Dependencia de FastAPI que valida si el usuario actual posee 
    al menos uno de los roles requeridos dentro de su empresa o ámbito 
    utilizando el modelo relacional UsuariosEmpresas y Roles.
    """
    def dependencia_verificacion(
        request: Request,
        usuario_actual: Usuarios = Depends(obtener_usuario_actual),
        db: Session = Depends(get_db)
    ):
        if not usuario_actual.activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La cuenta de usuario se encuentra inactiva."
            )

        # Extraer empresa_id del token JWT o de las cabeceras si aplica el contexto multiempresa
        empresa_id = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer"):
            try:
                token = auth_header.split(" ")[1]
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                empresa_id = payload.get("empresa_id")
            except Exception:
                pass
        
        if not empresa_id:
            empresa_id = request.headers.get("X-Empresa-ID")

        # Consultar los roles asignados al usuario a través de UsuariosEmpresas y Roles
        query = (
            db.query(UsuariosEmpresas)
            .join(Roles, UsuariosEmpresas.rol_id == Roles.id)
            .filter(
                UsuariosEmpresas.usuario_id == usuario_actual.id,
                UsuariosEmpresas.activo.is_(True),
                Roles.activo.is_(True)
            )
        )

        # Si tenemos un contexto de empresa claro, filtramos por él
        if empresa_id:
            query = query.filter(UsuariosEmpresas.empresa_id == empresa_id)

        asignaciones = query.all()
        nombres_roles_usuario = [asig.rol.nombre for asig in asignaciones if asig.rol]

        # Comprobar si alguno coincide con los permitidos
        tiene_permiso = any(rol in roles_permitidos for rol in nombres_roles_usuario)

        if not tiene_permiso:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere uno de los siguientes roles: {', '.join(roles_permitidos)}."
            )
        
        return usuario_actual
        
    return dependencia_verificacion