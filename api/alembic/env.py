import sys
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

_backend_path = r"C:\AppTrabajadores\api\backend"
if _backend_path not in sys.path:
    sys.path.insert(0, _backend_path)

from core.database import Base # type: ignore
from models import ( # type: ignore
    asignaciones_turno, auditoria_accesos, ausencias, calendarios_laborales,
    centros_trabajo, contratos, correcciones_fichaje, departamentos,
    dispositivos_fichaje, empresas, enums, festivos, fichajes, motivos_pausa,
    permisos, politicas_retencion, resumenes_jornada, roles,
    tipos_evento_fichaje, trabajadores, turnos, usuarios_roles, usuarios, vistas
)

_modelos = [
    empresas, trabajadores, turnos, asignaciones_turno, ausencias,
    fichajes, auditoria_accesos, enums, vistas, calendarios_laborales, centros_trabajo,
    contratos, correcciones_fichaje, departamentos, dispositivos_fichaje,
    festivos, motivos_pausa, permisos, politicas_retencion,
    resumenes_jornada, roles, tipos_evento_fichaje, usuarios_roles, usuarios
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
