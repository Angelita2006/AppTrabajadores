import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from core.config import settings
from core.database import Base 
from core import vistas

from models import ( 
    asignaciones_turno, auditoria_accesos, ausencias, calendarios_laborales,
    centros_trabajo, contratos, correcciones_fichaje, departamentos,
    dispositivos_fichaje, empresas,  festivos, fichajes, motivos_pausa,
    permisos, politicas_retencion, resumenes_jornada, roles_permisos, roles,
    trabajadores, turnos, usuarios, licencias, usuarios_empresas, gestorias_empresas, 
    contratos_calendarios
)

_modelos = [
    empresas, trabajadores, turnos, asignaciones_turno, ausencias,
    fichajes, auditoria_accesos, calendarios_laborales, centros_trabajo,
    contratos, correcciones_fichaje, departamentos, dispositivos_fichaje,
    festivos, motivos_pausa, permisos, politicas_retencion, resumenes_jornada, 
    roles_permisos, roles, usuarios, licencias, usuarios_empresas, gestorias_empresas, 
    contratos_calendarios, vistas
]

for modelo in _modelos:
    getattr(modelo, "__doc__", None)

config = context.config

database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

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
    # 1. Obtenemos la sección de configuración de alembic (por defecto [alembic])
    configuration = config.get_section(config.config_ini_section) or {}
    
    # 2. Inyectamos la URL de la base de datos de forma explícita y segura desde tus settings
    configuration["sqlalchemy.url"] = str(settings.DATABASE_URL)

    # 3. Creamos el motor con la configuración ya completa
    connectable = engine_from_config(
        configuration,
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
