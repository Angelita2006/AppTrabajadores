"""Prevent duplicate role-permission associations.

Revision ID: a6d19c4e2f30
Revises: 8c24cfab2d11
Create Date: 2026-10-14
"""

from typing import Sequence, Union

from alembic import op

revision: str = "a6d19c4e2f30"
down_revision: Union[str, None] = "8c24cfab2d11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "roles_permisos_rol_permiso_key",
        "roles_permisos",
        ["rol_id", "permiso_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "roles_permisos_rol_permiso_key",
        "roles_permisos",
        type_="unique",
    )
