"""Permite reutilizar correos de trabajadores y usuarios dados de baja.

Revision ID: f7c8d9e0a1b2
Revises: f1a2b3c4d5e6
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f7c8d9e0a1b2"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("usuarios_email_key", "usuarios", type_="unique")
    op.create_index(
        "usuarios_email_activo_key",
        "usuarios",
        ["email"],
        unique=True,
        postgresql_where=sa.text("activo IS TRUE"),
    )
    op.create_index(
        "trabajadores_email_activo_key",
        "trabajadores",
        ["email"],
        unique=True,
        postgresql_where=sa.text("activo IS TRUE AND email IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("trabajadores_email_activo_key", table_name="trabajadores")
    op.drop_index("usuarios_email_activo_key", table_name="usuarios")
    op.create_unique_constraint("usuarios_email_key", "usuarios", ["email"])