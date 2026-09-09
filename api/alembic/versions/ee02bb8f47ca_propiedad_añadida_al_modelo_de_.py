"""Propiedad añadida al modelo de trabajadores para relacionarlos directamente con los roles

Revision ID: ee02bb8f47ca
Revises: be47ceaeca8d
Create Date: 2026-08-26 13:32:35.566004

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ee02bb8f47ca'
down_revision: Union[str, Sequence[str], None] = 'be47ceaeca8d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Añadir únicamente la columna rol_id a la tabla trabajadores y su clave foránea limpia
    op.add_column('trabajadores', sa.Column('rol_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(
        'trabajadores_rol_id_fkey', 
        'trabajadores', 
        'roles', 
        ['rol_id'], 
        ['id'], 
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('trabajadores_rol_id_fkey', 'trabajadores', type_='foreignkey')
    op.drop_column('trabajadores', 'rol_id')