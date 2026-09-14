"""Corrige la vista de fichajes con efecto legal vigente.

Revision ID: d7f3a1c8e204
Revises: c2d9e6f14a7b
Create Date: 2026-09-10

"""
from typing import Sequence, Union

from alembic import op


revision: str = "d7f3a1c8e204"
down_revision: Union[str, Sequence[str], None] = "c2d9e6f14a7b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_VIEW_SQL = """
CREATE VIEW v_fichajes_vigentes AS
SELECT f.*
FROM public.fichajes f
WHERE f.id NOT IN (
    SELECT fichaje_sustituido_id
    FROM public.fichajes
    WHERE fichaje_sustituido_id IS NOT NULL
)
AND NOT EXISTS (
    SELECT 1
    FROM public.correcciones_fichaje c
    WHERE c.fichaje_afectado_id = f.id
      AND c.tipo_correccion = 'Anulación'
      AND c.estado = 'Aprobada'
)
"""


def upgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_fichajes_vigentes")
    op.execute(_VIEW_SQL)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_fichajes_vigentes")
    op.execute("CREATE VIEW v_fichajes_vigentes AS SELECT f.* FROM public.fichajes f")