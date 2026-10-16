"""Make departments belong to the company, not to a workplace.

Revision ID: f3a9d2c61480
Revises: e5f2a1b9c704
Create Date: 2026-10-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3a9d2c61480"
down_revision: Union[str, Sequence[str], None] = "e5f2a1b9c704"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "departamentos_empresa_centro_fkey",
        "departamentos",
        type_="foreignkey",
    )
    op.drop_column("departamentos", "centro_trabajo_id")
    op.alter_column(
        "departamentos",
        "empresa_id",
        existing_type=sa.UUID(),
        existing_nullable=False,
        comment="Identificador de la empresa propietaria del departamento.",
    )
    op.alter_column(
        "departamentos",
        "id",
        existing_type=sa.UUID(),
        existing_nullable=False,
        comment="Identificador único del departamento.",
    )
    op.alter_column(
        "departamentos",
        "nombre",
        existing_type=sa.String(length=255),
        existing_nullable=False,
        comment="Nombre del departamento organizativo.",
    )
    op.alter_column(
        "departamentos",
        "activo",
        existing_type=sa.Boolean(),
        existing_nullable=False,
        comment="Indica si el departamento está activo.",
    )
    op.execute(
        "COMMENT ON TABLE public.departamentos IS "
        "'Departamentos organizativos pertenecientes a una empresa.'"
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM public.departamentos d
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM public.centros_trabajo ct
                    WHERE ct.empresa_id = d.empresa_id
                )
            ) THEN
                RAISE EXCEPTION
                    'Cannot restore the required department workplace: one or more departments belong to a company without a workplace.';
            END IF;
        END
        $$;
        """
    )
    op.add_column(
        "departamentos",
        sa.Column("centro_trabajo_id", sa.UUID(), nullable=True),
    )
    op.execute(
        """
        UPDATE public.departamentos d
        SET centro_trabajo_id = (
            SELECT ct.id
            FROM public.centros_trabajo ct
            WHERE ct.empresa_id = d.empresa_id
            ORDER BY ct.created_at, ct.id
            LIMIT 1
        )
        """
    )
    op.alter_column("departamentos", "centro_trabajo_id", nullable=False)
    op.create_foreign_key(
        "departamentos_empresa_centro_fkey",
        "departamentos",
        "centros_trabajo",
        ["empresa_id", "centro_trabajo_id"],
        ["empresa_id", "id"],
        ondelete="RESTRICT",
    )
    op.alter_column(
        "departamentos",
        "empresa_id",
        existing_type=sa.UUID(),
        existing_nullable=False,
        comment="Identificador de la empresa a la que pertenece el departamento.",
    )
    op.alter_column(
        "departamentos",
        "nombre",
        existing_type=sa.String(length=255),
        existing_nullable=False,
        comment="Nombre del departamento.",
    )
    op.execute(
        "COMMENT ON TABLE public.departamentos IS "
        "'Departamentos de la empresa o centro de trabajo. Se pueden usar para clasificar a los trabajadores y asignarles turnos, calendarios laborales, etc.'"
    )
