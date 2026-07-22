import datetime
import os
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from core.database import get_db
from models.usuarios import Usuarios
from core.config import settings

# Claves de configuración para los tokens JWT (en producción, cámbialas por variables de entorno)
SECRET_KEY = settings.SECRET_KEY.__str__()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 

# Esquema de autenticación OAuth2 para FastAPI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/usuarios/login")


def get_password_hash(password: str) -> str:
    """
    Toma una contraseña en texto plano, la convierte a bytes,
    genera un salt automático y devuelve el hash encriptado como string.
    """
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    return hashed_bytes.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compara la contraseña en texto plano del login contra el hash de la base de datos.
    Devuelve True si coinciden, manejando correctamente la conversión de tipos.
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
    Genera un token JWT firmado digitalmente con una fecha de expiración.
    Se recomienda inyectar dentro de 'data' campos clave como:
    sub (user_id), empresa_id, y tipo_usuario para la lógica multiempresa.
    """
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def obtener_usuario_actual(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> Usuarios:
    """
    Dependencia de FastAPI para proteger rutas. 
    Decodifica el token Bearer, extrae el ID de usuario y valida su existencia y estado activo.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se han podido validar las credenciales de acceso.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_raw = payload.get("sub")
        if not isinstance(user_id_raw, str):
            raise credentials_exception
        user_id: str = user_id_raw
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    usuario = db.query(Usuarios).filter(Usuarios.id == user_id).first()
    if usuario is None or not usuario.activo:
        raise credentials_exception
        
    return usuario