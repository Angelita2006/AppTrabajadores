from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID
import hashlib
import secrets
import os

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Request,
    status,
    UploadFile,
)
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import func
from sqlalchemy.orm import joinedload, selectinload, Session

from core.archivos import CARPETA_FOTOS_USUARIOS
from core.auditoria import registrar_auditoria
from core.database import get_db
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    AlcancePermisoEnum,
    TipoPermisoEnum,
    TipoRolEnum,
)
from core.security import (
    crear_token_acceso,
    get_db_with_advanced_security,
    get_password_hash,
    oauth2_scheme,
    obtener_usuario_actual,
    verificar_permisos_requeridos,
    verify_password,
)
from core.utils import (
    enviar_correo_cambio_contraseña,
    enviar_correo_cambio_email,
)
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from models.gestorias_empresas import GestoriasEmpresas
from models.usuarios_empresas import UsuariosEmpresas
from models.roles import Roles
from models.roles_permisos import RolesPermisos
from models.permisos import Permisos
from schemas.auth import (
    ConfirmarPasswordRecuperacionRequest,
    LoginRequest,
    PasswordCambioRequest,
)
from schemas.usuarios import UsuarioCreate, UsuarioSimpleResponse, UsuarioUpdate

# APIRouter agrupa todos los endpoints relacionados con la gestión de usuarios bajo el prefijo "/api/usuarios".
router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "/me/accesos",
    summary="Consultar mis empresas, roles y permisos efectivos",
    description="Devuelve únicamente las membresías y permisos asociados a la cuenta autenticada.",
)
@limiter.limit("30/minute")
def obtener_mis_accesos(
    request: Request,
    empresa_id: Optional[UUID] = None,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([
        AccionPermisoEnum.CONSULTAR
        + "-"
        + TipoPermisoEnum.USUARIOS_EMPRESAS
        + "-"
        + AlcancePermisoEnum.PROPIO
    ])),
    db: Session = Depends(get_db),
):
    """**GET /api/usuarios/me/accesos**

    Consulta las empresas, roles y permisos propios sin exponer los de otros usuarios.
    """
    membresias = (
        db.query(UsuariosEmpresas)
        .join(Roles, Roles.id == UsuariosEmpresas.rol_id)
        .filter(
            UsuariosEmpresas.usuario_id == usuario_actual.id,
            UsuariosEmpresas.activo.is_(True),
        )
        .order_by(UsuariosEmpresas.created_at.asc())
        .all()
    )
    accesos = []
    for membresia in membresias:
        permisos = (
            db.query(Permisos)
            .join(RolesPermisos, RolesPermisos.permiso_id == Permisos.id)
            .filter(RolesPermisos.rol_id == membresia.rol_id)
            .order_by(Permisos.tipo, Permisos.accion, Permisos.alcance)
            .all()
        )
        accesos.append({
            "membresia_id": str(membresia.id),
            "empresa_id": str(membresia.empresa_id) if membresia.empresa_id else None,
            "rol": {
                "id": str(membresia.rol.id),
                "nombre": membresia.rol.nombre,
                "tipo": membresia.rol.tipo.value,
            },
            "permisos": [
                {
                    "recurso": permiso.tipo.value,
                    "accion": permiso.accion.value,
                    "alcance": permiso.alcance.value,
                }
                for permiso in permisos
            ],
        })

    # Proyecta solo los permisos que la gestoría tiene delegados para el cliente activo.
    if empresa_id and not any(
        acceso["empresa_id"] == str(empresa_id) for acceso in accesos
    ):
        delegacion = (
            db.query(UsuariosEmpresas, GestoriasEmpresas)
            .join(Roles, Roles.id == UsuariosEmpresas.rol_id)
            .join(
                GestoriasEmpresas,
                GestoriasEmpresas.empresa_gestora_id == UsuariosEmpresas.empresa_id,
            )
            .filter(
                UsuariosEmpresas.usuario_id == usuario_actual.id,
                UsuariosEmpresas.activo.is_(True),
                Roles.tipo == TipoRolEnum.ADMIN_GESTORIA,
                GestoriasEmpresas.empresa_cliente_id == empresa_id,
                GestoriasEmpresas.activo.is_(True),
                GestoriasEmpresas.fecha_inicio <= datetime.now().date(),
                (GestoriasEmpresas.fecha_fin.is_(None)
                 | (GestoriasEmpresas.fecha_fin >= datetime.now().date())),
            )
            .first()
        )
        if delegacion:
            membresia_gestoria, relacion = delegacion
            permisos_rol = (
                db.query(Permisos)
                .join(RolesPermisos, RolesPermisos.permiso_id == Permisos.id)
                .filter(RolesPermisos.rol_id == membresia_gestoria.rol_id)
                .order_by(Permisos.tipo, Permisos.accion, Permisos.alcance)
                .all()
            )
            claves_delegadas = set(relacion.permisos_delegados or []) & set(
                relacion.permisos_maximos or []
            )
            permisos_efectivos = [
                permiso
                for permiso in permisos_rol
                if f"{permiso.accion.value}-{permiso.tipo.value}-{permiso.alcance.value}"
                in claves_delegadas
            ]
            accesos.append({
                "membresia_id": str(membresia_gestoria.id),
                "empresa_id": str(empresa_id),
                "rol": {
                    "id": str(membresia_gestoria.rol.id),
                    "nombre": membresia_gestoria.rol.nombre,
                    "tipo": membresia_gestoria.rol.tipo.value,
                },
                "permisos": [
                    {
                        "recurso": permiso.tipo.value,
                        "accion": permiso.accion.value,
                        "alcance": permiso.alcance.value,
                    }
                    for permiso in permisos_efectivos
                ],
            })

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=None,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "usuarios_empresas", "accion": "consultar_accesos_propios"},
        trabajador_id=usuario_actual.trabajador_id,
    )
    db.commit()
    return accesos


@router.put(
    "/me/foto",
    response_model=UsuarioSimpleResponse,
    summary="Actualizar mi avatar de cuenta",
    description="Guarda una imagen privada asociada a la cuenta, independiente de las fotografías laborales.",
)
@limiter.limit("20/minute")
async def actualizar_mi_avatar(
    request: Request,
    file: UploadFile = File(...),
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([
        AccionPermisoEnum.MODIFICAR
        + "-"
        + TipoPermisoEnum.USUARIOS
        + "-"
        + AlcancePermisoEnum.PROPIO
    ])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**PUT /api/usuarios/me/foto**

    Actualiza el avatar global de la cuenta autenticada.
    """
    contenido = await file.read(5_000_001)
    if len(contenido) > 5_000_000:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La imagen supera el tamaño máximo de 5 MB.",
        )

    extensiones = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    extension = extensiones.get(file.content_type or "")
    firma_valida = (
        (extension == "jpg" and contenido.startswith(b"\xff\xd8\xff"))
        or (extension == "png" and contenido.startswith(b"\x89PNG\r\n\x1a\n"))
        or (
            extension == "webp"
            and len(contenido) >= 12
            and contenido[:4] == b"RIFF"
            and contenido[8:12] == b"WEBP"
        )
    )
    if not extension or not firma_valida:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no es una imagen JPEG, PNG o WEBP válida.",
        )

    # La dependencia de permisos autentica con get_db, mientras este endpoint
    # persiste con get_db_with_advanced_security. Vuelve a cargar la cuenta en
    # la sesión de escritura para no modificar una instancia ya separada.
    usuario = db.query(Usuarios).filter(Usuarios.id == usuario_actual.id).first()
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar la cuenta autenticada.",
        )

    os.makedirs(CARPETA_FOTOS_USUARIOS, exist_ok=True)
    nombre_archivo = f"usuario_{usuario.id}.{extension}"
    ruta_destino = CARPETA_FOTOS_USUARIOS / nombre_archivo
    ruta_anterior = usuario.foto_url
    try:
        ruta_destino.write_bytes(contenido)
        setattr(
            usuario,
            "foto_url",
            f"/api/archivos/fotos_usuarios/{nombre_archivo}?t={int(datetime.now().timestamp())}",
        )
        setattr(usuario, "updated_at", datetime.now(timezone.utc))
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario.id,
            empresa_id=None,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "usuarios", "accion": "actualizar_avatar"},
            trabajador_id=None,
        )
        db.commit()
        db.refresh(usuario)

        if ruta_anterior:
            nombre_anterior = ruta_anterior.split("?", 1)[0].rsplit("/", 1)[-1]
            if nombre_anterior != nombre_archivo:
                archivo_anterior = CARPETA_FOTOS_USUARIOS / nombre_anterior
                try:
                    if archivo_anterior.is_file():
                        archivo_anterior.unlink()
                except OSError as error_limpieza:
                    # La actualización ya está confirmada; un fallo de limpieza no debe
                    # convertir una subida correcta en una respuesta de error.
                    print(
                        f"No se pudo eliminar el avatar anterior del usuario "
                        f"({usuario.id}): {error_limpieza}."
                    )
        return usuario
    except OSError as error:
        db.rollback()
        print(f"No se pudo guardar el avatar de usuario ({usuario.id}): {error}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar la imagen de perfil.",
        ) from error
    except Exception as error:
        db.rollback()
        print(f"No se pudo actualizar el avatar de usuario ({usuario.id}): {error}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo actualizar la imagen de perfil.",
        ) from error

@router.get(
    "/me",
    response_model=UsuarioSimpleResponse,
    summary="Obtener perfil del usuario autenticado",
    description="Obtiene los datos del usuario autenticado.",
)
@limiter.limit("30/minute")
def obtener_mi_usuario(
    request: Request,
    token: str = Depends(oauth2_scheme),
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.USUARIOS + "-" + AlcancePermisoEnum.PROPIO])),
    db: Session = Depends(get_db),
):
    """
    **GET /api/usuarios/{id_usuario}**

    Busca los detalles de una cuenta mediante su identificador único UUID de forma protegida.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta del usuario autenticado ({token}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    usuario = (
        db.query(Usuarios).options(
        selectinload(Usuarios.trabajadores),
        joinedload(Usuarios.usuarios_empresas))
        .filter(Usuarios.id == usuario_actual.id)
        .first()
    )

    if not usuario:
        print(f"Usuario ({usuario_actual.id}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario no encontrado."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=None,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'usuarios',
            'accion': 'consultar_actual',
        },
        trabajador_id=None,
    )
    db.commit()

    return usuario


@router.get(
    "",
    response_model=List[UsuarioSimpleResponse],
    summary="Listar cuentas de usuario de la plataforma",
    description="Permite al superadministrador consultar las cuentas para asignar accesos y gestionar perfiles.",
)
@limiter.limit("30/minute")
def obtener_usuarios_plataforma(
    request: Request,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([
        AccionPermisoEnum.CONSULTAR
        + "-"
        + TipoPermisoEnum.USUARIOS
        + "-"
        + AlcancePermisoEnum.GLOBAL
    ])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /api/usuarios**

    Lista las cuentas de usuario visibles al superadministrador global.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(
        f"Petición de consulta de usuarios de la plataforma desde la IP "
        f"({cliente_ip}) por el usuario: {usuario_actual.email}."
    )

    usuarios = (
        db.query(Usuarios)
        .order_by(Usuarios.nombre.asc(), Usuarios.email.asc())
        .all()
    )
    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=None,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "usuarios", "accion": "consultar_plataforma"},
        trabajador_id=None,
    )
    db.commit()
    return usuarios


@router.post(
    "/confirmar-cambio-email",
    status_code=status.HTTP_200_OK,
    summary="Confirmar cambio de correo electrónico mediante enlace",
    description="Endpoint que procesa el clic en el enlace del correo. Valida el token, actualiza el email antiguo por el nuevo en el usuario y en su trabajador asociado, y limpia los campos temporales.",
)
@limiter.limit("20/minute")
def confirmar_cambio_email(
    request: Request,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Endpoint que procesa el clic en el enlace del correo. Valida el token,
    actualiza el email antiguo por el nuevo en el usuario y en su trabajador asociado, y limpia los campos temporales.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación al confirmar el cambio de email desde la IP ({cliente_ip}).")

    # Validaciones estructurales básicas
    usuario = db.query(Usuarios).filter(
        Usuarios.token_cambio_email == token
    ).first()

    if not usuario:
        print("El token de verificación es inválido.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token de verificación es inválido."
        )

    if usuario.token_cambio_email_expira_at and datetime.now(timezone.utc) > usuario.token_cambio_email_expira_at:
        setattr(usuario, 'token_cambio_email', None)
        setattr(usuario, 'token_cambio_email_expira_at', None)
        setattr(usuario, 'email_pendiente_verificacion', None)
        db.commit()
        print("El enlace de verificación ha expirado. Por favor, solicita uno nuevo desde tu perfil.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de verificación ha expirado. Por favor, solicita uno nuevo desde tu perfil."
        )

    nuevo_email = usuario.email_pendiente_verificacion
    if not nuevo_email:
        print("No hay ninguna solicitud de cambio de correo pendiente.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay ninguna solicitud de cambio de correo pendiente."
        )

    try:
        setattr(usuario, 'email', nuevo_email)
        setattr(usuario, 'email_pendiente_verificacion', None)
        setattr(usuario, 'token_cambio_email', None)
        setattr(usuario, 'token_cambio_email_expira_at', None)
        setattr(usuario, 'updated_at', datetime.now(timezone.utc))

        db.add(usuario)

        trabajadores = db.query(Trabajadores).filter(
            Trabajadores.usuario_id == usuario.id,
        ).all()
        for trabajador in trabajadores:
            setattr(trabajador, 'updated_at', datetime.now(timezone.utc))
            db.add(trabajador)

        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario.id,
            empresa_id=None,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': 'usuarios',
                'accion': 'confirmar_cambio_email',
            },
            trabajador_id=None,
        )
        db.commit()

    except Exception as e:
        db.rollback()
        print(f"No se ha podido completar el cambio de correo electrónico: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido completar el cambio de correo electrónico."
        )

    print(f"¡Correo electrónico confirmado y actualizado con éxito en tu cuenta ({usuario.email}) y perfil de trabajador!")
    return {"detail": "¡Correo electrónico confirmado y actualizado con éxito en tu cuenta y perfil de trabajador!"}

@router.post(
    "/confirmar-cambio-password",
    status_code=status.HTTP_200_OK,
    summary="Confirmar nueva contraseña con código",
    description="Valida el código de 6 dígitos recibido por correo y actualiza la contraseña definitivamente.",
)
@limiter.limit("5/minute")
def confirmar_cambio_password(
    request: Request,
    payload: ConfirmarPasswordRecuperacionRequest,
    token: str = Depends(oauth2_scheme),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """
    **POST /api/usuarios/confirmar-cambio-password**

    Valida el código de 6 dígitos recibido por correo y actualiza la contraseña definitivamente.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación al confirmar el cambio de contraseña ([token oculto]) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    if not usuario_actual.codigo_recuperacion or not usuario_actual.codigo_expira_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código no válido o caducado.")
    if datetime.now(timezone.utc) > usuario_actual.codigo_expira_at:
        setattr(usuario_actual, "codigo_recuperacion", None)
        setattr(usuario_actual, "codigo_expira_at", None)
        setattr(usuario_actual, "intentos_recuperacion", 0)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código no válido o caducado.")

    codigo_hash = hashlib.sha256(payload.codigo_verificacion.encode("utf-8")).hexdigest()
    codigo_guardado = str(usuario_actual.codigo_recuperacion)
    codigo_valido = secrets.compare_digest(codigo_guardado, codigo_hash)
    if len(codigo_guardado) == 6 and codigo_guardado.isdigit():
        codigo_valido = codigo_valido or secrets.compare_digest(codigo_guardado, payload.codigo_verificacion)
    if not codigo_valido:
        setattr(usuario_actual, "intentos_recuperacion", usuario_actual.intentos_recuperacion + 1)
        if usuario_actual.intentos_recuperacion >= 5:
            setattr(usuario_actual, "codigo_recuperacion", None)
            setattr(usuario_actual, "codigo_expira_at", None)
            setattr(usuario_actual, "intentos_recuperacion", 0)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código no válido o caducado.")

    try:
        setattr(usuario_actual, 'password_hash', get_password_hash(payload.nueva_password))
        setattr(usuario_actual, 'codigo_recuperacion', None)
        setattr(usuario_actual, 'intentos_recuperacion', 0)
        setattr(usuario_actual, 'codigo_expira_at', None)
        setattr(usuario_actual, 'updated_at', datetime.now(timezone.utc))

        db.add(usuario_actual)
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=request.headers.get('Empresa-ID'),
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': 'usuarios',
                'accion': 'confirmar_cambio_password',
            },
            trabajador_id=usuario_actual.trabajador_id,
        )
        db.commit()

        print(f"La contraseña ({usuario_actual.email}) ha sido modificada correctamente.")
        return {"detail": "Tu contraseña ha sido modificada correctamente."}
    except Exception as e:
        db.rollback()
        print(f"No se ha podido modificar la contraseña: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='No se ha podido modificar la contraseña.'
        )
@router.post(
    "/login",
    summary="Inicio de sesión en la plataforma",
    description="Autentica a un usuario validando su correo electrónico y contraseña, actualiza su último acceso y genera un token JWT de sesión.",
)
@limiter.limit("5/minute")
def login_plataforma(
    request: Request,
    credenciales: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    **POST /api/usuarios/login**

    Autentica a un usuario validando su correo electrónico y contraseña,
    actualiza su último acceso y genera un token JWT de sesión.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Intento de inicio de sesión desde la IP ({cliente_ip})")

    # Validaciones estructurales básicas
    usuario = (
        db.query(Usuarios).options(
        selectinload(Usuarios.trabajadores),
        joinedload(Usuarios.usuarios_empresas))
        .filter(Usuarios.email == str(credenciales.email).strip().lower(), Usuarios.activo.is_(True))
        .first()
    )

    if not usuario:
        print("No hay ningún usuario registrado con ese correo electrónico.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No hay ningún usuario registrado con ese correo electrónico.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(credenciales.password, str(usuario.password_hash)):
        print("La contraseña introducida es incorrecta.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La contraseña introducida es incorrecta.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    setattr(usuario, "ultimo_acceso", datetime.now())

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario.id,
        empresa_id=None,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'usuarios',
            'accion': 'login',
        },
        trabajador_id=None,
    )
    db.commit()
    db.refresh(usuario)

    access_token = crear_token_acceso(data={"sub": str(usuario.id), "id": usuario.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": UsuarioSimpleResponse.model_validate(usuario),
    }

@router.post(
    "/login-form",
    summary="Inicio de sesión compatible con Swagger UI",
    description="Endpoint auxiliar optimizado para autenticación OAuth2 estándar (Swagger UI).",
)
@limiter.limit("5/minute")
def login_para_swagger(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    **POST /api/usuarios/login-form**

    Endpoint auxiliar optimizado para autenticación OAuth2 estándar (Swagger UI).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de login OAuth2 desde la IP ({cliente_ip}).")

    # Validaciones estructurales básicas
    usuario = db.query(Usuarios).filter(
        Usuarios.email == form_data.username.strip().lower(),
        Usuarios.activo.is_(True),
    ).first()


    if not usuario:
        print("No hay ningún usuario registrado con ese correo electrónico.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No hay ningún usuario registrado con ese correo electrónico.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, str(usuario.password_hash)):
        print("La contraseña introducida es incorrecta.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La contraseña introducida es incorrecta.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario.id,
        empresa_id=None,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'usuarios',
            'accion': 'login_swagger',
        },
        trabajador_id=None,
    )
    db.commit()

    access_token = crear_token_acceso(data={"sub": usuario.email})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post(
    "/registro",
    response_model=UsuarioSimpleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registro inicial de usuario",
    description="Busca al trabajador existente mediante la empresa y el NIF, y crea credenciales de usuario vinculadas con contraseña hasheada.",
)
@limiter.limit("5/minute")
def crear_usuario(
    request: Request,
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
):
    """
    **POST /api/usuarios**

    Crea un usuario nuevo.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de usuario desde la IP ({cliente_ip}).")

    # Validaciones estructurales básicas
    email_limpio = str(payload.email).strip().lower()
    email_existente = db.query(Usuarios).filter(
        func.lower(Usuarios.email) == email_limpio,
        Usuarios.activo.is_(True),
    ).first()
    if email_existente:
        print("El correo electrónico ya se encuentra registrado en el sistema.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado en el sistema."
        )

    telefono_limpio = payload.telefono.strip() if payload.telefono else None
    telefono_existente = (
        db.query(Usuarios)
        .filter(Usuarios.telefono == telefono_limpio, Usuarios.activo.is_(True))
        .first()
        if telefono_limpio
        else None
    )
    if telefono_existente:
        print("El número de teléfono ya se encuentra registrado en el sistema.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El número de teléfono ya se encuentra registrado en el sistema."
        )

    usuario_existente = db.query(Usuarios).filter(func.lower(Usuarios.email) == email_limpio).first()
    if usuario_existente:
        print("Este trabajador ya dispone de una cuenta de usuario registrada.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este trabajador ya dispone de una cuenta de usuario registrada."
        )

    nuevo_usuario = Usuarios(
        nombre=payload.nombre,
        email=email_limpio,
        telefono=telefono_limpio,
        password_hash=get_password_hash(payload.password),
    )

    db.add(nuevo_usuario)
    db.flush()

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=nuevo_usuario.id,
        empresa_id=None,
        accion=AccionAuditoriaEnum.CREACION,
        detalle={
            'recurso': 'usuarios',
            'accion': 'crear',
        },
        trabajador_id=None,
    )

    db.commit()

    usuario = (
        db.query(Usuarios).options(
        selectinload(Usuarios.trabajadores),
        joinedload(Usuarios.usuarios_empresas))
        .filter(Usuarios.id == nuevo_usuario.id)
        .first()
    )

    db.refresh(usuario)
    return usuario

@router.put(
    "/solicitar-cambio-email",
    status_code=status.HTTP_200_OK,
    summary="Solicitar cambio de correo electrónico con verificación",
    description="Valida la unicidad del nuevo correo, genera un token seguro de verificación y envía un enlace al nuevo correo electrónico para confirmar el cambio.",
)
@limiter.limit("5/minute")
def solicitar_cambio_email(
    request: Request,
    nuevo_email: str,
    background_tasks: BackgroundTasks,
    token: str = Depends(oauth2_scheme),
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.USUARIOS + "-" + AlcancePermisoEnum.PROPIO])),
    db: Session = Depends(get_db),
):
    """
    Valida la unicidad del nuevo correo, genera un token seguro de verificación
    y envía un enlace al nuevo correo electrónico para confirmar el cambio.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de solicitar cambio email desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    email_limpio = str(nuevo_email).strip().lower()
    email_existente = db.query(Usuarios).filter(
        Usuarios.email == email_limpio,
        Usuarios.id != usuario_actual.id,
        Usuarios.activo.is_(True),
    ).first()
    if email_existente:
        print("El correo electrónico ya está en uso por otro usuario.")
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
        usuario_id=usuario_actual.id,
        empresa_id=request.headers.get('Empresa-ID'),
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={
            'recurso': 'usuarios',
            'accion': 'solicitar_cambio_email',
        },
        trabajador_id=usuario_actual.trabajador_id,
    )

    db.commit()
    db.refresh(usuario_actual)

    return {"detail": "Se ha enviado un enlace de confirmación a tu nuevo correo electrónico."}

@router.put(
    "/solicitar-cambio-password",
    status_code=status.HTTP_200_OK,
    summary="Solicitar código para cambio de contraseña",
    description="Valida la contraseña actual del usuario autenticado, genera un código aleatorio de 6 dígitos, lo guarda temporalmente y envía un correo electrónico de confirmación.",
)
@limiter.limit("5/minute")
def solicitar_cambio_password(
    request: Request,
    payload: PasswordCambioRequest,
    token: str = Depends(oauth2_scheme),
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.USUARIOS + "-" + AlcancePermisoEnum.PROPIO])),
    db: Session = Depends(get_db),
):
    """
    **POST /api/usuarios/solicitar-cambio-password**

    Valida la contraseña actual del usuario autenticado, genera un código aleatorio
    de 6 dígitos, lo guarda temporalmente y envía un correo electrónico de confirmación.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de solicitar cambio password ([token oculto]) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    if not verify_password(payload.antigua_password, str(usuario_actual.password_hash)):
        print("La contraseña actual introducida no es correcta.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual introducida no es correcta."
        )

    codigo_aleatorio = f"{secrets.randbelow(1_000_000):06d}"

    try:
        setattr(usuario_actual, 'codigo_recuperacion', hashlib.sha256(codigo_aleatorio.encode('utf-8')).hexdigest())
        setattr(usuario_actual, 'codigo_expira_at', datetime.now(timezone.utc) + timedelta(minutes=15))
        setattr(usuario_actual, 'intentos_recuperacion', 0)

        db.add(usuario_actual)
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=request.headers.get('Empresa-ID'),
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': 'usuarios',
                'accion': 'solicitar_cambio_password',
            },
            trabajador_id=usuario_actual.trabajador_id,
        )
        db.commit()

    except Exception as e:
        db.rollback()
        print(f"No se ha podido procesar la solicitud de cambio de contraseña: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido procesar la solicitud de cambio de contraseña."
        )

    enviar_correo_cambio_contraseña(usuario_actual.email, codigo_aleatorio)

    return {"detail": "Se ha enviado un código de verificación a tu correo electrónico para confirmar el cambio."}

@router.put(
    "/{id_usuario}/estado",
    response_model=UsuarioSimpleResponse,
    summary="Modificar estado de usuario",
    description="Modifica el estado de un usuario.",
)
@limiter.limit("30/minute")
def modificar_estado_usuario(
    request: Request,
    id_usuario: UUID,
    payload: UsuarioUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.USUARIOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PUT /api/usuarios/{id_usuario}/estado?activo=false**

    Modifica el estado de un usuario.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación del estado del usuario ({id_usuario}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    usuario = (
        db.query(Usuarios).options(
        selectinload(Usuarios.trabajadores),
        joinedload(Usuarios.usuarios_empresas))
        .filter(Usuarios.id == id_usuario)
        .first()
    )

    if not usuario:
        print(f"Usuario ({id_usuario}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado.",
        )

    try:
        setattr(usuario, "activo", payload.activo)
        setattr(usuario, "updated_at", datetime.now())

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=None,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': 'usuarios',
                'accion': 'modificar_estado',
            },
            trabajador_id=None,
        )
        db.commit()
        db.refresh(usuario)

        return usuario
    except Exception as e:
        db.rollback()
        print(f"No se ha podido modificar el estado del usuario: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido modificar el estado del usuario.",
        )
