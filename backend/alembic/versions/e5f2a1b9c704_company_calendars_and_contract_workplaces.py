"""Move calendars to company scope and allow multiple contract workplaces.

Revision ID: e5f2a1b9c704
Revises: c8b86cbf3ac8
Create Date: 2026-10-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f2a1b9c704"
down_revision: Union[str, Sequence[str], None] = "c8b86cbf3ac8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "contratos_empresa_id_id_key", "contratos", ["empresa_id", "id"]
    )

    op.create_table(
        "contratos_centros_trabajo",
        sa.Column(
            "id", sa.UUID(), nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("empresa_id", sa.UUID(), nullable=False),
        sa.Column("contrato_id", sa.UUID(), nullable=False),
        sa.Column("centro_trabajo_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name="contratos_centros_trabajo_pkey"),
        sa.ForeignKeyConstraint(
            ["empresa_id", "contrato_id"],
            ["contratos.empresa_id", "contratos.id"],
            ondelete="CASCADE",
            name="contratos_centros_trabajo_contrato_fkey",
        ),
        sa.ForeignKeyConstraint(
            ["empresa_id", "centro_trabajo_id"],
            ["centros_trabajo.empresa_id", "centros_trabajo.id"],
            ondelete="RESTRICT",
            name="contratos_centros_trabajo_centro_fkey",
        ),
        sa.UniqueConstraint(
            "empresa_id", "contrato_id", "centro_trabajo_id",
            name="contratos_centros_trabajo_empresa_contrato_centro_key",
        ),
        comment="Centros físicos donde se puede desarrollar un contrato laboral.",
    )
    op.execute(
        """
        INSERT INTO public.contratos_centros_trabajo
            (empresa_id, contrato_id, centro_trabajo_id)
        SELECT empresa_id, id, centro_trabajo_id
        FROM public.contratos
        WHERE centro_trabajo_id IS NOT NULL
        """
    )
    op.execute("ALTER TABLE public.contratos_centros_trabajo ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.contratos_centros_trabajo FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY rls_contratos_centros_trabajo_policy
        ON public.contratos_centros_trabajo
        FOR ALL
        USING (
            current_setting('app.is_superadmin', true) = 'true'
            OR (
                current_setting('app.allowed_empresa_ids', true) IS NOT NULL
                AND empresa_id = ANY(
                    string_to_array(
                        replace(replace(current_setting('app.allowed_empresa_ids', true), 'ARRAY[', ''), ']', ''),
                        ','
                    )::uuid[]
                )
            )
            OR (
                current_setting('app.current_empresa_id', true) IS NOT NULL
                AND empresa_id = current_setting('app.current_empresa_id', true)::uuid
            )
        )
        WITH CHECK (
            current_setting('app.is_superadmin', true) = 'true'
            OR (
                current_setting('app.allowed_empresa_ids', true) IS NOT NULL
                AND empresa_id = ANY(
                    string_to_array(
                        replace(replace(current_setting('app.allowed_empresa_ids', true), 'ARRAY[', ''), ']', ''),
                        ','
                    )::uuid[]
                )
            )
            OR (
                current_setting('app.current_empresa_id', true) IS NOT NULL
                AND empresa_id = current_setting('app.current_empresa_id', true)::uuid
            )
        )
        """
    )

    op.drop_constraint(
        "contratos_empresa_centro_fkey", "contratos", type_="foreignkey"
    )
    op.drop_constraint(
        "contratos_empresa_centro_id_key", "contratos", type_="unique"
    )
    op.drop_column("contratos", "centro_trabajo_id")

    op.drop_constraint(
        "calendarios_laborales_empresa_centro_fkey",
        "calendarios_laborales",
        type_="foreignkey",
    )
    op.drop_constraint(
        "calendarios_laborales_empresa_centro_anio_key",
        "calendarios_laborales",
        type_="unique",
    )
    op.drop_constraint(
        "calendarios_laborales_empresa_centro_id_key",
        "calendarios_laborales",
        type_="unique",
    )
    op.drop_column("calendarios_laborales", "centro_trabajo_id")


def downgrade() -> None:
    op.add_column(
        "calendarios_laborales",
        sa.Column("centro_trabajo_id", sa.UUID(), nullable=True),
    )
    op.execute(
        """
        UPDATE public.calendarios_laborales cal
        SET centro_trabajo_id = (
            SELECT ct.id FROM public.centros_trabajo ct
            WHERE ct.empresa_id = cal.empresa_id
            ORDER BY ct.created_at, ct.id
            LIMIT 1
        )
        """
    )
    op.alter_column("calendarios_laborales", "centro_trabajo_id", nullable=False)
    op.create_foreign_key(
        "calendarios_laborales_empresa_centro_fkey",
        "calendarios_laborales",
        "centros_trabajo",
        ["empresa_id", "centro_trabajo_id"],
        ["empresa_id", "id"],
        ondelete="RESTRICT",
    )
    op.create_unique_constraint(
        "calendarios_laborales_empresa_centro_anio_key",
        "calendarios_laborales",
        ["empresa_id", "centro_trabajo_id", "anio"],
    )
    op.create_unique_constraint(
        "calendarios_laborales_empresa_centro_id_key",
        "calendarios_laborales",
        ["empresa_id", "centro_trabajo_id", "id"],
    )

    op.add_column(
        "contratos", sa.Column("centro_trabajo_id", sa.UUID(), nullable=True)
    )
    op.execute(
        """
        UPDATE public.contratos c
        SET centro_trabajo_id = (
            SELECT cct.centro_trabajo_id
            FROM public.contratos_centros_trabajo cct
            WHERE cct.contrato_id = c.id
            ORDER BY cct.created_at, cct.id
            LIMIT 1
        )
        """
    )
    op.alter_column("contratos", "centro_trabajo_id", nullable=False)
    op.create_foreign_key(
        "contratos_empresa_centro_fkey",
        "contratos",
        "centros_trabajo",
        ["empresa_id", "centro_trabajo_id"],
        ["empresa_id", "id"],
        ondelete="RESTRICT",
    )
    op.create_unique_constraint(
        "contratos_empresa_centro_id_key",
        "contratos",
        ["empresa_id", "centro_trabajo_id", "id"],
    )
    op.execute(
        "DROP POLICY IF EXISTS rls_contratos_centros_trabajo_policy "
        "ON public.contratos_centros_trabajo"
    )
    op.drop_table("contratos_centros_trabajo")
    op.drop_constraint("contratos_empresa_id_id_key", "contratos", type_="unique")
