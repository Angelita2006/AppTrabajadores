"""Propiedad añadida al modelo de correcciones de fichaje para que guarde el id del tipo de evento de fichaje correspondiente

Revision ID: bdb183d5018f
Revises: ee02bb8f47ca
Create Date: 2026-08-27 17:50:48.211936

"""
from typing import Sequence, Union
from alembic import op
from sqlalchemy_views import CreateView, DropView
from models.vistas import t_v_fichajes_vigentes, sql_v_fichajes_vigentes

# revision identifiers, used by Alembic.
revision: str = 'bdb183d5018f'
down_revision: Union[str, Sequence[str], None] = 'ee02bb8f47ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Crear la vista oficialmente en la base de datos
    op.execute(CreateView(t_v_fichajes_vigentes, sql_v_fichajes_vigentes))


def downgrade() -> None:
    """Downgrade schema."""
    # Eliminar la vista en caso de un rollback
    op.execute(DropView(t_v_fichajes_vigentes))