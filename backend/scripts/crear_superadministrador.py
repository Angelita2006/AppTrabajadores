"""Crea la primera cuenta global de superadministración.

Se puede ejecutar desde la raíz del repositorio o desde ``backend``:

    python backend/scripts/crear_superadministrador.py
    python -m scripts.crear_superadministrador  # desde backend
"""

import sys
from getpass import getpass
from pathlib import Path

# Permite ejecutar el archivo desde la raíz del repositorio sin depender del cwd.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import func, inspect
from sqlalchemy.exc import SQLAlchemyError

from core.config import settings
if not settings.DATABASE_URL.strip():
    raise SystemExit(
        "DATABASE_URL no está configurada. Comprueba el .env de la raíz del proyecto "
        "o define FICHAPP_ENV_FILE."
    )

from core.database import SessionLocal, engine
from core.enums import TipoRolEnum
from core.init_db import inicializar_roles_sistema
from core.security import get_password_hash

# Importar todos los modelos para asegurar que SQLAlchemy resuelva relaciones correctamente
from models import (
    asignaciones_turno,
    auditoria_accesos,
    ausencias,
    calendarios_laborales,
    centros_trabajo,
    contratos,
    contratos_calendarios,
    correcciones_fichaje,
    departamentos,
    dispositivos_fichaje,
    empresas,
    festivos,
    fichajes,
    gestorias_empresas,
    licencias,
    motivos_pausa,
    permisos,
    politicas_retencion,
    resumenes_jornada,
    roles_permisos,
    trabajadores,
    turnos,
    usuarios,
    usuarios_empresas,
)
from models.roles import Roles
from models.usuarios import Usuarios
from models.usuarios_empresas import UsuariosEmpresas


def _validar_esquema() -> None:
    try:
        inspector = inspect(engine)
        tablas = set(inspector.get_table_names())
    except SQLAlchemyError as error:
        causa = getattr(error, "orig", error)
        raise SystemExit(
            "No se pudo conectar con la base de datos. Revisa DATABASE_URL, el servicio "
            f"PostgreSQL y las credenciales. Detalle: {causa}"
        ) from error

    requeridas = {"usuarios", "usuarios_empresas", "roles"}
    faltantes = requeridas - tablas
    if faltantes:
        raise SystemExit(
            "Falta aplicar el esquema de la base de datos. Ejecuta primero "
            "'python -m alembic upgrade head' desde backend."
        )

    # Definida de forma segura tras comprobar las tablas requeridas
    columnas_membresia = {
        columna["name"]: columna
        for columna in inspector.get_columns("usuarios_empresas")
    }

    if "empresa_id" not in columnas_membresia or not columnas_membresia["empresa_id"]["nullable"]:
        raise SystemExit(
            "La base de datos no permite membresías globales. Aplica las migraciones "
            "con 'python -m alembic upgrade head' desde backend."
        )


def main() -> None:
    _validar_esquema()

    email_introducido = input("Correo del superadministrador: ").strip()
    if not email_introducido or len(email_introducido) > 30:
        raise SystemExit("Introduce un correo de hasta 30 caracteres.")
    try:
        email = validate_email(email_introducido, check_deliverability=False).normalized.lower()
    except EmailNotValidError as error:
        raise SystemExit(f"El correo no es válido: {error}") from error
    if len(email) > 30:
        raise SystemExit("El correo normalizado supera el límite de 30 caracteres de la base de datos.")

    password = getpass("Contraseña (mínimo 12 caracteres): ")
    confirmacion = getpass("Repite la contraseña: ")
    if password != confirmacion:
        raise SystemExit("Las contraseñas no coinciden.")
    if len(password) < 12 or len(password.encode("utf-8")) > 72:
        raise SystemExit("La contraseña debe tener entre 12 caracteres y 72 bytes UTF-8.")

    db = SessionLocal()
    try:
        # Garantiza que el rol exista incluso si la API todavía no ha arrancado.
        inicializar_roles_sistema(db)

        usuario_existente = (
            db.query(Usuarios)
            .filter(func.lower(Usuarios.email) == email)
            .first()
        )
        if usuario_existente:
            membresia_global_activa = (
                db.query(UsuariosEmpresas)
                .join(Roles, UsuariosEmpresas.rol_id == Roles.id)
                .filter(
                    UsuariosEmpresas.usuario_id == usuario_existente.id,
                    UsuariosEmpresas.empresa_id.is_(None),
                    UsuariosEmpresas.activo.is_(True),
                    Roles.tipo == TipoRolEnum.SUPERADMINISTRADOR,
                    Roles.empresa_id.is_(None),
                )
                .first()
            )
            if membresia_global_activa and usuario_existente.activo:
                print(f"La cuenta {email} ya está configurada como superadministrador global.")
                return
            raise SystemExit(
                "Ese correo ya está registrado. El script no eleva privilegios de cuentas existentes."
            )

        rol = (
            db.query(Roles)
            .filter(
                Roles.tipo == TipoRolEnum.SUPERADMINISTRADOR,
                Roles.empresa_id.is_(None),
            )
            .first()
        )
        if rol is None:
            raise SystemExit(
                "No se pudo inicializar el rol global Superadministrador. "
                "Comprueba que la migración actualizó el esquema y que el usuario de base de datos "
                "tiene permisos para inicializar roles globales."
            )

        usuario = Usuarios(
            nombre="Superadministrador de Fichapp",
            email=email,
            password_hash=get_password_hash(password),
            activo=True,
        )
        db.add(usuario)
        db.flush()

        db.add(
            UsuariosEmpresas(
                usuario_id=usuario.id,
                empresa_id=None,
                rol_id=rol.id,
                activo=True,
            )
        )
        db.commit()
        print(f"Cuenta global de superadministración creada para {email}.")
    except SystemExit:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        causa = getattr(error, "orig", error)
        raise SystemExit(
            "No se pudo crear la cuenta de superadministración. "
            f"Error de base de datos: {causa}"
        ) from error
    except Exception as error:
        db.rollback()
        raise SystemExit(f"No se pudo crear la cuenta de superadministración: {error}") from error
    finally:
        db.close()


if __name__ == "__main__":
    main()