"""Remove redundant access role from worker profiles.

Revision ID: c71e4a98d205
Revises: b2f6d8a14c30
Create Date: 2026-10-15
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c71e4a98d205"
down_revision: Union[str, Sequence[str], None] = "b2f6d8a14c30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "trabajadores_rol_id_fkey",
        "trabajadores",
        type_="foreignkey",
    )
    op.drop_column("trabajadores", "rol_id")


def downgrade() -> None:
    op.add_column(
        "trabajadores",
        sa.Column(
            "rol_id",
            sa.Uuid(),
            nullable=True,
            comment="Identificador del rol de acceso del trabajador.",
        ),
    )
    op.create_foreign_key(
        "trabajadores_rol_id_fkey",
        "trabajadores",
        "roles",
        ["rol_id"],
        ["id"],
        ondelete="SET NULL",
    )
