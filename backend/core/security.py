import datetime
from typing import Generator
import uuid
import bcrypt
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.orm import Session
from core.database import SessionLocal, get_db
from core.config import settings
from core.enums import TipoRolEnum
from models.empresas import Empresas
from models.gestorias_empresas import GestoriasEmpresas
from models.usuarios import Usuarios
from models.usuarios_empresas import UsuariosEmpresas
from models.roles import Roles
from models.permisos import Permisos
from models.roles_permisos import RolesPermisos

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

def _obtener_y_validar_empresa(request: Request, db: Session) -> Empresas:
    """
    Función auxiliar privada para extraer, validar el formato UUID de la cabecera 
    'Empresa-ID' y comprobar la existencia de la empresa en base de datos. (Principio DRY)
    """
    empresa_id = request.headers.get("Empresa-ID")
    try:
        empresa_uuid = uuid.UUID(empresa_id)
    except TypeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No se ha proporcionado un id de empresa en la cabecera de la petición."
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El id de empresa proporcionado en la cabecera de la petición no es un id válido."
        )

    empresa = db.query(Empresas).filter(Empresas.id == empresa_uuid).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No se ha podido encontrar ninguna empresa en la base de datos con el id proporcionado en la cabecera."
        )
    return empresa

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

def get_db_with_advanced_security(
    request: Request,
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
) -> Generator[Session, None, None]:
    """
    Generador de sesión avanzado para SaaS multiempresa con PostgreSQL RLS.
    Resuelve automáticamente el rol del usuario, consulta sus autorizaciones 
    y configura las variables SET LOCAL en PostgreSQL de forma transparente.
    """
    db = SessionLocal()
    try:
        # 1. Consultar membresías y roles del usuario en el sistema
        membresias = (
            db.query(UsuariosEmpresas)
            .outerjoin(Empresas, UsuariosEmpresas.empresa_id == Empresas.id)
            .join(Usuarios, UsuariosEmpresas.usuario_id == Usuarios.id)
            .join(Roles, UsuariosEmpresas.rol_id == Roles.id)
            .filter(
                UsuariosEmpresas.usuario_id == usuario_actual.id,
                UsuariosEmpresas.activo.is_(True)
            )
            .all()
        )

        # -------------------------------------------------------------
        # CASO 1: SUPERADMINISTRADOR GLOBAL
        # -------------------------------------------------------------
        is_superadministrador = any(m for m in membresias if m.rol.tipo == TipoRolEnum.SUPERADMINISTRADOR and m.empresa is None)
        if is_superadministrador:
            db.execute(text("SET LOCAL app.is_superadmin = 'true'"))

        else:
            # Reutilizamos la función auxiliar DRY para validar la empresa actual
            empresa = _obtener_y_validar_empresa(request, db)

            db.execute(text("SET LOCAL app.is_superadmin = 'false'"))

            is_admin_gestoria = any(m for m in membresias if m.rol.tipo == TipoRolEnum.ADMIN_GESTORIA and m.empresa_id is not None and m.empresa_id == empresa.id)
            is_inspector = any(m for m in membresias if m.rol.tipo == TipoRolEnum.AUDITOR_ITSS and m.empresa_id is not None and m.empresa_id == empresa.id)
            
            # -------------------------------------------------------------
            # CASO 2: ADMIN DE GESTORÍA (Acceso a sus empresas clientes)
            # -------------------------------------------------------------
            if is_admin_gestoria:
                clientes = (
                    db.query(GestoriasEmpresas.empresa_cliente_id)
                    .filter(
                        GestoriasEmpresas.empresa_gestora_id == empresa.id,
                        GestoriasEmpresas.activo.is_(True)
                    )
                    .all()
                )
                allowed_ids = {c.empresa_cliente_id for c in clientes}
                allowed_ids.add(empresa.id)

                ids_formatted = ",".join([f"'{eid}'" for eid in allowed_ids])
                db.execute(text(f"SET LOCAL app.allowed_empresa_ids = ARRAY[{ids_formatted}]::uuid[]"))

            # -------------------------------------------------------------
            # CASO 3: AUDITOR ITSS / INSPECTOR (Acceso Multi-Empresa directo)
            # -------------------------------------------------------------
            elif is_inspector:
                allowed_ids = [m.empresa_id for m in membresias if m.rol.tipo == TipoRolEnum.AUDITOR_ITSS and m.empresa_id is not None]
                ids_formatted = ",".join([f"'{eid}'" for eid in allowed_ids])
                db.execute(text(f"SET LOCAL app.allowed_empresa_ids = ARRAY[{ids_formatted}]::uuid[]"))

            # -------------------------------------------------------------
            # CASO 4: EMPRESA INDIVIDUAL
            # -------------------------------------------------------------
            else:
                is_miembro_empresa = any(m for m in membresias if m.empresa_id is not None and m.empresa_id == empresa.id)

                if is_miembro_empresa:
                    db.execute(text(f"SET LOCAL app.current_empresa_id = '{empresa.id}'"))
                else:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No se ha encontrado una relación activa entre la empresa con el id proporcionado y el usuario autenticado.")

        yield db
    finally:
        db.close()

def verificar_permisos_requeridos(permisos_requeridos: list[str]):
    """
    Dependencia de FastAPI que valida si el rol activo que posee 
    el usuario en la empresa actual cuenta con los permisos requeridos (en formato 'accion-tipo').
    """
    def dependencia_verificacion(
        request: Request,
        usuario_actual: Usuarios = Depends(obtener_usuario_actual),
        db: Session = Depends(get_db)
    ):
        # 1. Verificar si el usuario está activo
        if not usuario_actual.activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La cuenta de usuario se encuentra inactiva."
            )

        # 2. Comprobar si es Superadministrador global
        is_superadministrador = (
            db.query(UsuariosEmpresas)
            .join(Roles, UsuariosEmpresas.rol_id == Roles.id)
            .filter(
                UsuariosEmpresas.usuario_id == usuario_actual.id,
                UsuariosEmpresas.activo.is_(True),
                Roles.tipo == TipoRolEnum.SUPERADMINISTRADOR,
                UsuariosEmpresas.empresa_id.is_(None)
            )
            .first()
        )
        if is_superadministrador:
            return usuario_actual

        # 3. Validar empresa mediante la función auxiliar DRY
        empresa = _obtener_y_validar_empresa(request, db)

        # 4. Obtener la única membresía activa del usuario para esta empresa específica
        membresia = (
            db.query(UsuariosEmpresas)
            .join(Roles, UsuariosEmpresas.rol_id == Roles.id)
            .filter(
                UsuariosEmpresas.usuario_id == usuario_actual.id,
                UsuariosEmpresas.empresa_id == empresa.id,
                UsuariosEmpresas.activo.is_(True),
                Roles.activo.is_(True)
            )
            .first()
        )

        if not membresia:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="El usuario no cuenta con una relación activa para esta empresa."
            )

        rol_id = membresia.rol_id

        # 5. Cargar TODOS los permisos del rol en una sola consulta
        permisos_rol = (
            db.query(Permisos)
            .join(RolesPermisos, RolesPermisos.permiso_id == Permisos.id)
            .filter(RolesPermisos.rol_id == rol_id)
            .all()
        )
        
        # Convertir a un conjunto en memoria para validación rápida 
        permisos_concedidos_set = {f"{p.accion}-{p.tipo}" for p in permisos_rol}

        # 6. Validar que se cumplan los permisos requeridos
        for permiso_str in permisos_requeridos:
            if "-" not in permiso_str or permiso_str not in permisos_concedidos_set:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Acceso denegado. No dispones de los permisos requeridos para realizar esta acción."
                )
        
        return usuario_actual
        
    return dependencia_verificacion