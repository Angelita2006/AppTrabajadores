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
        # 1. Extraer el contexto de empresa desde la cabecera HTTP (enviada por el frontend)
        empresa_id = request.headers.get("Empresa-ID")

        # 2. Consultar membresías y roles del usuario en el sistema
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
            # Si no se ha proporcionado un id de empresa en la cabecera o no existe ninguna empresa con ese id y no tiene una relación global de superadministrador
            try:
                empresa_uuid = uuid.UUID(empresa_id)
            except TypeError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se ha proporcionado un id de empresa en la cabecera de la petición.")
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El id de empresa proporcionado en la cabecera de la petición no es un id válido.")

            empresa = db.query(Empresas).filter(Empresas.id == empresa_uuid).first()

            if not empresa:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se ha podido encontrar ninguna empresa en la base de datos con el id proporcionado en la cabecera de la petición.")

            db.execute(text("SET LOCAL app.is_superadmin = 'false'"))

            # Saber si hay alguna relación del usuario con la empresa si es una gestoría en la que sea admin
            is_admin_gestoria = any(m for m in membresias if m.rol.tipo == TipoRolEnum.ADMIN_GESTORIA and m.empresa_id is not None and m.empresa_id == empresa.id)
            # Saber si hay alguna relación del usuario con la empresa en la que sea auditor
            is_inspector = any(m for m in membresias if m.rol.tipo == TipoRolEnum.AUDITOR_ITSS and m.empresa_id is not None and m.empresa_id == empresa.id)
            
            # -------------------------------------------------------------
            # CASO 2: ADMIN DE GESTORÍA (Acceso a sus empresas clientes)
            # -------------------------------------------------------------
            if is_admin_gestoria:
                # Consultar empresas clientes vinculadas en gestorias_empresas
                clientes = (
                    db.query(GestoriasEmpresas.empresa_cliente_id)
                    .filter(
                        GestoriasEmpresas.empresa_gestora_id == empresa.id,
                        GestoriasEmpresas.activo.is_(True)
                    )
                    .all()
                )
                allowed_ids = {c.empresa_cliente_id for c in clientes} # Incluir las empresas clientes
                allowed_ids.add(empresa.id) # Incluir la propia gestoría

                ids_formatted = ",".join([f"'{eid}'" for eid in allowed_ids])
                db.execute(text(f"SET LOCAL app.allowed_empresa_ids = ARRAY[{ids_formatted}]::uuid[]"))

            # -------------------------------------------------------------
            # CASO 3: AUDITOR ITSS / INSPECTOR (Acceso Multi-Empresa directo)
            # -------------------------------------------------------------
            elif is_inspector:
                allowed_ids = [m.empresa_id for m in membresias if m.rol.tipo == TipoRolEnum.AUDITOR_ITSS and m.empresa_id is not None] # Incluir las empresas que tiene autorizadas para inspeccionar
                ids_formatted = ",".join([f"'{eid}'" for eid in allowed_ids])
                db.execute(text(f"SET LOCAL app.allowed_empresa_ids = ARRAY[{ids_formatted}]::uuid[]"))

            # -------------------------------------------------------------
            # CASO 4: EMPRESA INDIVIDUAL (Admin Empresa, RRHH, Trabajador, Representante Legal, Otro (Personalizado de la empresa))
            # -------------------------------------------------------------
            else:
                # Utiliza el id de la empresa proporcionado en la cabecera Empresa-ID de la petición
                is_miembro_empresa = any(m for m in membresias if m.empresa_id is not None and m.empresa_id == empresa.id)

                if is_miembro_empresa:
                    db.execute(text(f"SET LOCAL app.current_empresa_id = '{empresa.id}'"))
                else:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No se ha encontrado una relación activa entre la empresa con el id proporcionado y el usuario autenticado.")

        yield db
    finally:
        db.close()

def verificar_roles_permitidos(roles_permitidos: list[str]):
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
        # Verificar si el usuario está activo
        if not usuario_actual.activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La cuenta de usuario se encuentra inactiva."
            )

        # Extraer el id de empresa desde la cabecera
        empresa_id = request.headers.get("Empresa-ID")

        # Consultar membresías y roles del usuario en el sistema
        membresias = (
            db.query(UsuariosEmpresas)
            .outerjoin(Empresas, UsuariosEmpresas.empresa_id == Empresas.id)
            .join(Usuarios, UsuariosEmpresas.usuario_id == Usuarios.id)
            .join(Roles, UsuariosEmpresas.rol_id == Roles.id)
            .filter(
                UsuariosEmpresas.usuario_id == usuario_actual.id,
                UsuariosEmpresas.activo.is_(True)
            )
        )

        # Si hay una relación cuyo rol sea del tipo superadministrador y no tenga id de empresa
        if any(m for m in membresias.all() if m.rol.tipo == TipoRolEnum.SUPERADMINISTRADOR and m.empresa_id is None):
            rol_usuario = TipoRolEnum.SUPERADMINISTRADOR
        else:
            # Sacar el uuid a partir del id de empresa enviado en la cabecera, si aplica
            try:
                empresa_uuid = uuid.UUID(empresa_id)
            except TypeError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se ha proporcionado un id de empresa en la cabecera de la petición.")
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El id de empresa proporcionado en la cabecera de la petición no es un id válido.")

            # Saca el objeto empresa con el uuid obtenido gracias a la cabecera, si aplica
            empresa = db.query(Empresas).filter(Empresas.id == empresa_uuid).first()
            if not empresa:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se ha podido encontrar ninguna empresa en la base de datos con el id proporcionado en la cabecera de la petición.")

            # Filtra las membresias por la empresa proporcionada
            membresias.filter(UsuariosEmpresas.empresa_id == empresa.id)

            # El rol del usuario actual para la empresa proporcionada
            rol_usuario = [m.rol.tipo for m in membresias.all() if m.rol.tipo]

        # Comprobar si coincide con alguno de los roles permitidos
        tiene_rol_requerido = any(rol in roles_permitidos for rol in rol_usuario)
        if not tiene_rol_requerido:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere uno de los siguientes roles: {', '.join(roles_permitidos)}."
            )
        
        return usuario_actual
        
    return dependencia_verificacion

def verificar_permisos_requeridos(permisos_requeridos: list[str]):
    """
    Dependencia de FastAPI que valida si el único rol activo que posee 
    el usuario en la empresa actual (según la cabecera 'Empresa-ID') 
    cuenta con al menos uno de los permisos requeridos (en formato 'accion-tipo').
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

        # 2. Comprobar si es Superadministrador global (bypass total mediante membresía global con empresa_id NULL)
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

        # 3. Extraer y validar el id de empresa desde la cabecera
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

        # 5. Comprobar si el rol único del usuario tiene asignado alguno de los permisos requeridos
        tiene_permiso = False
        
        for permiso_str in permisos_requeridos:
            if "-" not in permiso_str:
                tiene_permiso = False
                break
            
            # Desglosar la cadena "accion-tipo"
            accion_parte, tipo_parte = permiso_str.split("-", 1)

            # Consultar si existe la relación en roles_permisos para este rol
            asociacion = (
                db.query(RolesPermisos)
                .join(Permisos, RolesPermisos.permiso_id == Permisos.id)
                .filter(
                    RolesPermisos.rol_id == rol_id,
                    Permisos.accion == accion_parte,
                    Permisos.tipo == tipo_parte
                )
                .first()
            )

            if not asociacion:
                tiene_permiso = False
                break

        if not tiene_permiso:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No dispones de los permisos requeridos para realizar esta acción."
            )
        
        return usuario_actual
        
    return dependencia_verificacion