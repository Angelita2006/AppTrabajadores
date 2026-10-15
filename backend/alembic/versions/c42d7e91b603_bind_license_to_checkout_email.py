"""Bind a purchased license to its checkout email.

Revision ID: c42d7e91b603
Revises: a82f0d9c41b7
Create Date: 2026-10-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c42d7e91b603"
down_revision: Union[str, Sequence[str], None] = "a82f0d9c41b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "licencias",
        sa.Column("stripe_checkout_email", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("licencias", "stripe_checkout_email")
