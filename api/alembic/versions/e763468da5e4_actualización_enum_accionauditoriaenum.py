"""Actualización enum AccionAuditoriaEnum

Revision ID: e763468da5e4
Revises: b23cf7e7f746
Create Date: 2026-09-17 17:02:45.585283

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e763468da5e4'
down_revision: Union[str, Sequence[str], None] = 'b23cf7e7f746'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
