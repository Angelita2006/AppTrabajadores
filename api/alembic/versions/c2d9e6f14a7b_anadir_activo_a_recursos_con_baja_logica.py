"""Añade activo a recursos con baja lógica.

Revision ID: c2d9e6f14a7b
Revises: bafe89b31672
Create Date: 2026-09-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c2d9e6f14a7b'
down_revision: Union[str, Sequence[str], None] = 'bafe89b31672'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for tabla in (
        'calendarios_laborales',
        'departamentos',
        'festivos',
        'tipos_evento_fichaje',
        'turnos',
    ):
        op.add_column(
            tabla,
            sa.Column('activo', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        )


def downgrade() -> None:
    for tabla in (
        'turnos',
        'tipos_evento_fichaje',
        'festivos',
        'departamentos',
        'calendarios_laborales',
    ):
        op.drop_column(tabla, 'activo')