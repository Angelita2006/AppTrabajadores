"""Harden password recovery code storage and attempt limits.

Revision ID: d2a7c9e13f40
Revises: 91c3a2e7d641
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d2a7c9e13f40"
down_revision: Union[str, Sequence[str], None] = "91c3a2e7d641"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.alter_column("usuarios", "codigo_recuperacion", existing_type=sa.String(length=10), type_=sa.String(length=64), existing_nullable=True)
    op.add_column("usuarios", sa.Column("intentos_recuperacion", sa.Integer(), server_default=sa.text("0"), nullable=False))

def downgrade() -> None:
    op.drop_column("usuarios", "intentos_recuperacion")
    op.alter_column("usuarios", "codigo_recuperacion", existing_type=sa.String(length=64), type_=sa.String(length=10), existing_nullable=True)
