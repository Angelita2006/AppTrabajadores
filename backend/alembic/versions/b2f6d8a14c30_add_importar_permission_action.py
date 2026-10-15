"""Add importar to the permission action enum.

Revision ID: b2f6d8a14c30
Revises: e31b5f90ac42
"""
from typing import Sequence, Union

from alembic import op

revision: str = "b2f6d8a14c30"
down_revision: Union[str, Sequence[str], None] = "e31b5f90ac42"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Elimina asociaciones y permisos de acciones heredadas que ya no existen.
    op.execute(
        """
        DELETE FROM roles_permisos rp
        USING permisos p
        WHERE rp.permiso_id = p.id
          AND p.accion::text IN ('aprobar', 'fichar');
        """
    )
    op.execute("DELETE FROM permisos WHERE accion::text IN ('aprobar', 'fichar');")

    # PostgreSQL no permite borrar etiquetas ENUM. Se reconstruye el tipo con
    # las acciones vigentes para instalaciones existentes y nuevas.
    op.execute("ALTER TABLE permisos ALTER COLUMN accion DROP DEFAULT;")
    op.execute(
        "CREATE TYPE accion_permiso_enum_nueva AS ENUM "
        "('consultar', 'crear', 'modificar', 'eliminar', 'importar', 'exportar');"
    )
    op.execute(
        "ALTER TABLE permisos ALTER COLUMN accion TYPE accion_permiso_enum_nueva "
        "USING accion::text::accion_permiso_enum_nueva;"
    )
    op.execute("DROP TYPE accion_permiso_enum;")
    op.execute("ALTER TYPE accion_permiso_enum_nueva RENAME TO accion_permiso_enum;")
    op.execute(
        "ALTER TABLE permisos ALTER COLUMN accion "
        "SET DEFAULT 'consultar'::accion_permiso_enum;"
    )


def downgrade() -> None:
    # Restaurar las etiquetas heredadas es seguro, pero no recupera las filas
    # antiguas eliminadas durante upgrade.
    op.execute("ALTER TYPE accion_permiso_enum ADD VALUE IF NOT EXISTS 'aprobar';")
    op.execute("ALTER TYPE accion_permiso_enum ADD VALUE IF NOT EXISTS 'fichar';")
