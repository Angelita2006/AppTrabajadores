"""Renombrada propiedad dni_nif_nie trabajadores y cambios en routes

Revision ID: 7c3d51af8879
Revises: ae4b5f8be9dd
Create Date: 2026-09-08 11:55:34.613139

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c3d51af8879'
down_revision: Union[str, Sequence[str], None] = 'ae4b5f8be9dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Renombrar la columna existente en lugar de borrarla y crear otra
    op.alter_column('trabajadores', 'nif_nie', new_column_name='dni_nif_nie')
    
    # 2. Actualizar las restricciones de unicidad correspondientes
    op.drop_constraint('trabajadores_empresa_id_nif_nie_key', 'trabajadores', type_='unique')
    op.create_unique_constraint('trabajadores_empresa_id_dni_nif_nie_key', 'trabajadores', ['empresa_id', 'dni_nif_nie'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('trabajadores_empresa_id_dni_nif_nie_key', 'trabajadores', type_='unique')
    op.create_unique_constraint('trabajadores_empresa_id_nif_nie_key', 'trabajadores', ['empresa_id', 'nif_nie'])
    op.alter_column('trabajadores', 'dni_nif_nie', new_column_name='nif_nie')