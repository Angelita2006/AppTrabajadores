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
from core.enums import AlcancePermisoEnum, TipoPermisoEnum, AccionPermisoEnum, TipoRolEnum
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
    """Hash a UTF-8 password, rejecting values longer than bcrypt supports."""
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        raise ValueError("Password exceeds bcrypt's 72-byte limit.")
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    return hashed_bytes.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compara la contraseña en texto plano del login contra el hash de la base de datos.
    Devuelve True si coinciden, manejando correctamente la conversión de tipos y excepciones.
    """
    try:
        if len(plain_password.encode('utf-8')) > 72:
            return False
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
    if not empresa or not empresa.activa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No se ha podido encontrar ninguna empresa en la base de datos con el id proporcionado en la cabecera."
        )
    return empresa

def obtener_usuario_actual(
    request: Request,
    db: Session = Depends(get_db)
) -> Usuarios:
    """Authenticate the request using only its Authorization Bearer header."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se han podido validar las credenciales de acceso.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = None

    # 1. Intentar obtener el token de la cabecera HTTP
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()

    # 2. Si no está en el header, buscar en los parámetros de la URL (?token=...)
    # Never accept bearer credentials from URLs: URLs are commonly logged and retained.

    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_email_raw = payload.get("sub")
        if not isinstance(user_email_raw, str):
            raise credentials_exception
        user_id = user_email_raw
        if "@" not in user_id:
            try:
                user_id = uuid.UUID(user_id)
            except (TypeError, ValueError):
                raise credentials_exception
    except JWTError:
        raise credentials_exception

    if "@" in str(user_id): 
        usuario = db.query(Usuarios).filter(Usuarios.email == str(user_id).strip().lower(), Usuarios.activo.is_(True)).first()
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
    # The tenant context is installed with SET LOCAL and ends at commit. Keep already
    # loaded ORM values available when FastAPI serializes a response after the commit.
    db.expire_on_commit = False
    try:
        # Inicializa siempre el contexto de tenant para que una conexión reutilizada
        # nunca herede valores de una petición anterior.
        db.execute(
            text("SELECT set_config('app.is_superadmin', 'false', false), "
                 "set_config('app.current_empresa_id', '00000000-0000-0000-0000-000000000000', false), "
                 "set_config('app.allowed_empresa_ids', 'ARRAY[]', false)")
        )
        # Consultar membresías y roles del usuario en el sistema
        membresias = (
            db.query(UsuariosEmpresas)
            .outerjoin(Empresas, UsuariosEmpresas.empresa_id == Empresas.id)
            .join(Usuarios, UsuariosEmpresas.usuario_id == Usuarios.id)
            .join(Roles, UsuariosEmpresas.rol_id == Roles.id)
            .filter(
                UsuariosEmpresas.usuario_id == usuario_actual.id,
                UsuariosEmpresas.activo.is_(True),
            )
            .all()
        )

        # -------------------------------------------------------------
        # CASO 1: SUPERADMINISTRADOR GLOBAL
        # -------------------------------------------------------------
        is_superadministrador = any(m for m in membresias if m.rol.tipo == TipoRolEnum.SUPERADMINISTRADOR and m.empresa is None)
        if is_superadministrador:
            db.execute(text("SELECT set_config('app.is_superadmin', :value, false)"), {"value": "true"})

        else:
            # Validar la empresa actual
            empresa = _obtener_y_validar_empresa(request, db)

            db.execute(text("SELECT set_config('app.is_superadmin', :value, false)"), {"value": "false"})

            gestorias_admin = {
                m.empresa_id
                for m in membresias
                if m.rol.tipo == TipoRolEnum.ADMIN_GESTORIA and m.empresa_id is not None
            }
            is_admin_gestoria = empresa.id in gestorias_admin
            es_cliente_gestoria = False
            if not is_admin_gestoria and gestorias_admin:
                es_cliente_gestoria = (
                    db.query(GestoriasEmpresas.id)
                    .filter(
                        GestoriasEmpresas.empresa_gestora_id.in_(gestorias_admin),
                        GestoriasEmpresas.empresa_cliente_id == empresa.id,
                        GestoriasEmpresas.activo.is_(True),
                        GestoriasEmpresas.fecha_inicio <= datetime.date.today(),
                        (GestoriasEmpresas.fecha_fin.is_(None)
                         | (GestoriasEmpresas.fecha_fin >= datetime.date.today())),
                    )
                    .first()
                    is not None
                )
            is_inspector = any(m for m in membresias if m.rol.tipo == TipoRolEnum.AUDITOR_ITSS and m.empresa_id is not None and m.empresa_id == empresa.id)
            
            # -------------------------------------------------------------
            # CASO 2: ADMIN DE GESTORÍA (Acceso a sus empresas clientes)
            # -------------------------------------------------------------
            if is_admin_gestoria or es_cliente_gestoria:
                # Una sesión solo puede consultar el tenant seleccionado por la petición.
                allowed_ids = {empresa.id}

                ids_formatted = "ARRAY[" + ",".join(str(eid) for eid in sorted(allowed_ids, key=str)) + "]"
                db.execute(text("SELECT set_config('app.allowed_empresa_ids', :value, false)"), {"value": ids_formatted})

            # -------------------------------------------------------------
            # CASO 3: AUDITOR ITSS / INSPECTOR (Acceso Multi-Empresa directo)
            # -------------------------------------------------------------
            elif is_inspector:
                allowed_ids = [empresa.id]
                ids_formatted = "ARRAY[" + ",".join(str(eid) for eid in sorted(set(allowed_ids), key=str)) + "]"
                db.execute(text("SELECT set_config('app.allowed_empresa_ids', :value, false)"), {"value": ids_formatted})

            # -------------------------------------------------------------
            # CASO 4: EMPRESA INDIVIDUAL
            # -------------------------------------------------------------
            else:
                is_miembro_empresa = any(m for m in membresias if m.empresa_id is not None and m.empresa_id == empresa.id)

                if is_miembro_empresa:
                    db.execute(text("SELECT set_config('app.current_empresa_id', :value, false)"), {"value": str(empresa.id)})
                else:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No se ha encontrado una relación activa entre la empresa con el id proporcionado y el usuario autenticado.")

            db.execute(
                text("SELECT set_config('app.current_empresa_id', :value, false)"),
                {"value": str(empresa.id)},
            )
            db.execute(
                text("SELECT set_config('app.allowed_empresa_ids', :value, false)"),
                {"value": f"ARRAY[{empresa.id}]"},
            )

        yield db
    finally:
        try:
            db.rollback()
            db.execute(
                text("SELECT set_config('app.is_superadmin', 'false', false), "
                     "set_config('app.current_empresa_id', '00000000-0000-0000-0000-000000000000', false), "
                     "set_config('app.allowed_empresa_ids', 'ARRAY[]', false)")
            )
            db.commit()
        except Exception:
            db.rollback()
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
            request.state.alcance_efectivo = AlcancePermisoEnum.GLOBAL.value
            return usuario_actual

        if any(permiso_str.endswith(f"-{AlcancePermisoEnum.GLOBAL.value}") for permiso_str in permisos_requeridos):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Los permisos globales están reservados al superadministrador.",
            )

        empresa_id_header = request.headers.get("Empresa-ID")
        empresa = _obtener_y_validar_empresa(request, db) if empresa_id_header else None
        membresia = None
        relacion_delegada = None

        if empresa is not None:
            membresia = (
                db.query(UsuariosEmpresas)
                .join(Roles, UsuariosEmpresas.rol_id == Roles.id)
                .filter(
                    UsuariosEmpresas.usuario_id == usuario_actual.id,
                    UsuariosEmpresas.empresa_id == empresa.id,
                    UsuariosEmpresas.activo.is_(True),
                )
                .first()
            )
            if membresia is None:
                resultado_delegado = (
                    db.query(UsuariosEmpresas, GestoriasEmpresas)
                    .join(Roles, UsuariosEmpresas.rol_id == Roles.id)
                    .join(
                        GestoriasEmpresas,
                        GestoriasEmpresas.empresa_gestora_id == UsuariosEmpresas.empresa_id,
                    )
                    .filter(
                        UsuariosEmpresas.usuario_id == usuario_actual.id,
                        UsuariosEmpresas.activo.is_(True),
                        Roles.tipo == TipoRolEnum.ADMIN_GESTORIA,
                        GestoriasEmpresas.empresa_cliente_id == empresa.id,
                        GestoriasEmpresas.activo.is_(True),
                        GestoriasEmpresas.fecha_inicio <= datetime.date.today(),
                        (GestoriasEmpresas.fecha_fin.is_(None)
                         | (GestoriasEmpresas.fecha_fin >= datetime.date.today())),
                    )
                    .first()
                )
                if resultado_delegado:
                    membresia, relacion_delegada = resultado_delegado
        else:
            # Las consultas propias (por ejemplo, /usuarios/me) no requieren una
            # empresa seleccionada; deben poseer una membresía activa que las conceda.
            membresias = (
                db.query(UsuariosEmpresas)
                .join(Roles, UsuariosEmpresas.rol_id == Roles.id)
                .filter(
                    UsuariosEmpresas.usuario_id == usuario_actual.id,
                    UsuariosEmpresas.activo.is_(True),
                )
                .all()
            )
            for candidata in membresias:
                permisos_candidatos = (
                    db.query(Permisos)
                    .join(RolesPermisos, RolesPermisos.permiso_id == Permisos.id)
                    .filter(RolesPermisos.rol_id == candidata.rol_id)
                    .all()
                )
                claves = {
                    (p.accion.value, p.tipo.value, p.alcance.value)
                    for p in permisos_candidatos
                }
                if all(
                    _permiso_satisfecho(claves, permiso_str)[0]
                    for permiso_str in permisos_requeridos
                ):
                    membresia = candidata
                    break

        if membresia is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario no cuenta con una relación activa para este ámbito.",
            )

        permisos_rol = (
            db.query(Permisos)
            .join(RolesPermisos, RolesPermisos.permiso_id == Permisos.id)
            .filter(RolesPermisos.rol_id == membresia.rol_id)
            .all()
        )
        claves_concedidas = {
            (p.accion.value, p.tipo.value, p.alcance.value)
            for p in permisos_rol
        }

        alcance_efectivo = AlcancePermisoEnum.EMPRESA.value
        for permiso_str in permisos_requeridos:
            satisface, alcance = _permiso_satisfecho(claves_concedidas, permiso_str)
            if not satisface:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Acceso denegado. No dispones de los permisos requeridos para realizar esta acción.",
                )
            if alcance == AlcancePermisoEnum.PROPIO.value:
                alcance_efectivo = AlcancePermisoEnum.PROPIO.value

            if relacion_delegada is not None:
                partes = permiso_str.split("-")
                clave_canonica = (
                    f"{partes[0]}-{partes[1]}-{alcance}"
                    if len(partes) == 2
                    else f"{partes[0]}-{partes[1]}-{alcance}"
                )
                if (
                    clave_canonica not in (relacion_delegada.permisos_delegados or [])
                    or clave_canonica not in (relacion_delegada.permisos_maximos or [])
                ):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="La empresa cliente no ha delegado este permiso en la gestoría.",
                    )

        request.state.alcance_efectivo = alcance_efectivo
        request.state.empresa_autorizada_id = empresa.id if empresa is not None else None
        return usuario_actual
        
    return dependencia_verificacion


def _permiso_satisfecho(
    concedidos: set[tuple[str, str, str]], permiso_requerido: str
) -> tuple[bool, str | None]:
    """Comprueba el permiso requerido respetando jerarquía de alcance."""
    partes = permiso_requerido.split("-")
    if len(partes) == 2:
        accion, tipo = partes
        alcance = AlcancePermisoEnum.EMPRESA.value
    elif len(partes) == 3:
        accion, tipo, alcance = partes
    else:
        return False, None

    if alcance == AlcancePermisoEnum.PROPIO.value:
        if (accion, tipo, AlcancePermisoEnum.EMPRESA.value) in concedidos:
            return True, AlcancePermisoEnum.EMPRESA.value
        if (accion, tipo, AlcancePermisoEnum.PROPIO.value) in concedidos:
            return True, AlcancePermisoEnum.PROPIO.value
        return False, None

    if (accion, tipo, alcance) in concedidos:
        return True, alcance
    return False, None
