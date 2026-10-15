"""Add account avatars and allow one worker profile per company.

Revision ID: d4b7a9c2e601
Revises: c42d7e91b603
Create Date: 2026-10-15
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4b7a9c2e601"
down_revision: Union[str, Sequence[str], None] = "c42d7e91b603"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column(
            "foto_url",
            sa.Text(),
            nullable=True,
            comment="Ruta privada del avatar de la cuenta de usuario.",
        ),
    )
    op.drop_constraint(
        "trabajadores_usuario_id_key",
        "trabajadores",
        type_="unique",
    )
    op.create_unique_constraint(
        "trabajadores_empresa_usuario_key",
        "trabajadores",
        ["empresa_id", "usuario_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "trabajadores_empresa_usuario_key",
        "trabajadores",
        type_="unique",
    )
    op.create_unique_constraint(
        "trabajadores_usuario_id_key",
        "trabajadores",
        ["usuario_id"],
    )
    op.drop_column("usuarios", "foto_url")
