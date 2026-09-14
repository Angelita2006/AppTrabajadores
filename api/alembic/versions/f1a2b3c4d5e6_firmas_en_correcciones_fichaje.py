"""Añade firmas al flujo de correcciones de fichajes.

Revision ID: f1a2b3c4d5e6
Revises: d7f3a1c8e204
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "d7f3a1c8e204"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("correcciones_fichaje", sa.Column("firma_solicitante", sa.Text(), nullable=True))
    op.add_column("correcciones_fichaje", sa.Column("firma_resolutor", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("correcciones_fichaje", "firma_resolutor")
    op.drop_column("correcciones_fichaje", "firma_solicitante")
