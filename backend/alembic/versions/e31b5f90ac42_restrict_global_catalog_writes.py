"""Restrict writes to global catalog rows to superadministrators.

Revision ID: e31b5f90ac42
Revises: d2a7c9e13f40
"""
from typing import Sequence, Union

from alembic import op

revision: str = "e31b5f90ac42"
down_revision: Union[str, Sequence[str], None] = "d2a7c9e13f40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("motivos_pausa", "roles", "politicas_retencion"):
        op.execute(
            f"""
            CREATE POLICY rls_{table}_insert_scope
            ON public.{table} AS RESTRICTIVE FOR INSERT
            WITH CHECK (
                current_setting('app.is_superadmin', true) = 'true'
                OR empresa_id IS NOT NULL
            );
            """
        )
        op.execute(
            f"""
            CREATE POLICY rls_{table}_update_scope
            ON public.{table} AS RESTRICTIVE FOR UPDATE
            USING (
                current_setting('app.is_superadmin', true) = 'true'
                OR empresa_id IS NOT NULL
            )
            WITH CHECK (
                current_setting('app.is_superadmin', true) = 'true'
                OR empresa_id IS NOT NULL
            );
            """
        )
        op.execute(
            f"""
            CREATE POLICY rls_{table}_delete_scope
            ON public.{table} AS RESTRICTIVE FOR DELETE
            USING (
                current_setting('app.is_superadmin', true) = 'true'
                OR empresa_id IS NOT NULL
            );
            """
        )


def downgrade() -> None:
    for table in ("motivos_pausa", "roles", "politicas_retencion"):
        op.execute(f"DROP POLICY IF EXISTS rls_{table}_delete_scope ON public.{table};")
        op.execute(f"DROP POLICY IF EXISTS rls_{table}_update_scope ON public.{table};")
        op.execute(f"DROP POLICY IF EXISTS rls_{table}_insert_scope ON public.{table};")
