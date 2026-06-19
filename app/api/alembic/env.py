from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
from core.database import Base 
from backend.models import asignaciones_turno, auditoria_accesos, ausencias, calendarios_laborales, centros_trabajo, contratos, correcciones_fichaje, departamentos, dispositivos_fichaje, empresas, enums, festivos, fichajes, motivos_pausa, permisos, politicas_retencion, resumenes_jornada, roles, tipos_evento_fichaje, trabajadores, turnos, usuarios_roles, usuarios, vistas

# Forzamos a SQLAlchemy a mapear físicamente tus tablas en memoria antes de comparar
# Accedemos a los diccionarios de metadatos de cada archivo para asegurar su inicialización
_modelos = [
    empresas, trabajadores, turnos, asignaciones_turno, ausencias,
    fichajes, auditoria_accesos, enums, vistas, calendarios_laborales, centros_trabajo,
    contratos, correcciones_fichaje, departamentos, dispositivos_fichaje,
    festivos, motivos_pausa, permisos, politicas_retencion,
    resumenes_jornada, roles, tipos_evento_fichaje, usuarios_roles, usuarios
]

for modelo in _modelos:
    getattr(modelo, "__doc__", None)

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
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
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
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
