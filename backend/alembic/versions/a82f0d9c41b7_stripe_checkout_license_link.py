"""Add Stripe Checkout session reference to licenses.

Revision ID: a82f0d9c41b7
Revises: c71e4a98d205
Create Date: 2026-10-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a82f0d9c41b7"
down_revision: Union[str, Sequence[str], None] = "c71e4a98d205"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "licencias",
        sa.Column("stripe_checkout_session_id", sa.String(length=255), nullable=True),
    )
    op.create_unique_constraint(
        "licencias_stripe_checkout_session_id_key",
        "licencias",
        ["stripe_checkout_session_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "licencias_stripe_checkout_session_id_key",
        "licencias",
        type_="unique",
    )
    op.drop_column("licencias", "stripe_checkout_session_id")
