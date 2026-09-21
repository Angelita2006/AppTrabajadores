"""Actualización enum AccionAuditoriaEnum

Revision ID: b23cf7e7f746
Revises: 7a5962b45679
Create Date: 2026-09-17 16:48:14.747068

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b23cf7e7f746'
down_revision: Union[str, Sequence[str], None] = '7a5962b45679'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE accion_auditoria_enum ADD VALUE IF NOT EXISTS 'Creación';")
    op.execute("ALTER TYPE accion_auditoria_enum ADD VALUE IF NOT EXISTS 'Modificación';")
    op.execute("ALTER TYPE accion_auditoria_enum ADD VALUE IF NOT EXISTS 'Baja_logica';")
    op.execute("ALTER TYPE accion_auditoria_enum ADD VALUE IF NOT EXISTS 'Eliminación';")
    op.execute("ALTER TYPE accion_auditoria_enum ADD VALUE IF NOT EXISTS 'Exportación';")
    op.execute("ALTER TYPE accion_auditoria_enum ADD VALUE IF NOT EXISTS 'Importación';")
    op.execute("ALTER TYPE accion_auditoria_enum ADD VALUE IF NOT EXISTS 'Descarga';")
    op.execute("ALTER TYPE accion_auditoria_enum ADD VALUE IF NOT EXISTS 'Acceso_denegado';")

def downgrade() -> None:
    """Downgrade schema."""
    # PostgreSQL no permite eliminar valores de un ENUM de forma nativa.
    pass