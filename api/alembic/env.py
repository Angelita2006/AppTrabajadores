import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Obtener dinámicamente la ruta absoluta del directorio actual y del backend
_current_dir = os.path.dirname(os.path.abspath(__file__))
# Si env.py está dentro de 'alembic/' y 'backend' está al mismo nivel o dentro:
_backend_path = os.path.abspath(os.path.join(_current_dir, "..", "backend"))
if not os.path.exists(_backend_path):
    # Por si env.py está directamente dentro de la raíz o estructurado diferente
    _backend_path = os.path.abspath(os.path.join(_current_dir, ".."))

if _backend_path not in sys.path:
    sys.path.insert(0, _backend_path)

from core.database import Base # type: ignore
from models import ( # type: ignore
    asignaciones_turno, auditoria_accesos, ausencias, calendarios_laborales,
    centros_trabajo, contratos, correcciones_fichaje, departamentos,
    dispositivos_fichaje, empresas,  festivos, fichajes, motivos_pausa,
    permisos, politicas_retencion, resumenes_jornada, roles_permisos, roles,
    tipos_evento_fichaje, trabajadores, turnos, usuarios_roles, usuarios, vistas, licencias
)

_modelos = [
    empresas, trabajadores, turnos, asignaciones_turno, ausencias,
    fichajes, auditoria_accesos, vistas, calendarios_laborales, centros_trabajo,
    contratos, correcciones_fichaje, departamentos, dispositivos_fichaje,
    festivos, motivos_pausa, permisos, politicas_retencion,
    resumenes_jornada, roles_permisos, roles, tipos_evento_fichaje, usuarios_roles, usuarios, licencias
]

for modelo in _modelos:
    getattr(modelo, "__doc__", None)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Ejecución de migraciones en modo offline."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Ejecución de migraciones en modo online."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
