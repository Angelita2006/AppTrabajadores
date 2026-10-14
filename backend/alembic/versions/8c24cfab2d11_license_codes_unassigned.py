"""Allow unassigned license codes and enforce code uniqueness.

Revision ID: 8c24cfab2d11
Revises: 9603b8bce250
Create Date: 2026-10-14
"""

from typing import Sequence, Union

from alembic import op

revision: str = "8c24cfab2d11"
down_revision: Union[str, None] = "9603b8bce250"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("licencias", "empresa_id", nullable=True)
    op.create_unique_constraint("licencias_codigo_key", "licencias", ["codigo"])


def downgrade() -> None:
    op.drop_constraint("licencias_codigo_key", "licencias", type_="unique")
    # El downgrade solo es posible después de canjear o eliminar todos los códigos libres.
    op.alter_column("licencias", "empresa_id", nullable=False)
