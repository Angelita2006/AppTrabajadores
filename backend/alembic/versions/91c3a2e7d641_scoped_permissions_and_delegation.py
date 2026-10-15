"""Add permission scopes, employee account links and gestoría delegation limits.

Revision ID: 91c3a2e7d641
Revises: 76460cd687c7
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "91c3a2e7d641"
down_revision: Union[str, Sequence[str], None] = "76460cd687c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    alcance_enum = postgresql.ENUM(
        "propio", "empresa", "global", name="alcance_permiso_enum"
    )
    alcance_enum.create(op.get_bind(), checkfirst=True)

    op.drop_constraint("permisos_tipo_accion_key", "permisos", type_="unique")
    op.add_column(
        "permisos",
        sa.Column(
            "alcance",
            alcance_enum,
            server_default=sa.text("'empresa'::alcance_permiso_enum"),
            nullable=False,
            comment="Ámbito del permiso: datos propios, empresa o plataforma global.",
        ),
    )
    op.create_unique_constraint(
        "permisos_tipo_accion_alcance_key",
        "permisos",
        ["tipo", "accion", "alcance"],
    )

    op.add_column(
        "trabajadores",
        sa.Column("usuario_id", sa.Uuid(), nullable=True, comment="Cuenta de acceso asociada a este trabajador."),
    )
    op.create_foreign_key(
        "trabajadores_usuario_id_fkey",
        "trabajadores",
        "usuarios",
        ["usuario_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_unique_constraint("trabajadores_usuario_id_key", "trabajadores", ["usuario_id"])

    op.create_index(
        "usuarios_empresas_global_activo_usuario_key",
        "usuarios_empresas",
        ["usuario_id"],
        unique=True,
        postgresql_where=sa.text("empresa_id IS NULL AND activo IS TRUE"),
    )

    op.add_column(
        "gestorias_empresas",
        sa.Column(
            "permisos_delegados",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
            comment="Permisos máximos que la gestoría puede ejercer en esta empresa cliente.",
        ),
    )
    op.add_column(
        "gestorias_empresas",
        sa.Column(
            "permisos_maximos",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
            comment="Techo de permisos de delegación configurado por el superadministrador.",
        ),
    )

    # El tipo correcto es esencial para que el control de acceso detecte los roles semilla.
    op.execute("""
        UPDATE roles SET tipo = 'Superadministrador'::tipo_rol_enum
        WHERE empresa_id IS NULL AND nombre = 'Superadministrador'
    """)
    op.execute("""
        UPDATE roles SET tipo = 'Trabajador'::tipo_rol_enum
        WHERE empresa_id IS NULL AND (id = '5aca163e-53f3-4210-9924-cff25ab38444' OR nombre = 'Trabajador')
    """)
    op.execute("""
        UPDATE roles SET tipo = 'Rrhh'::tipo_rol_enum
        WHERE empresa_id IS NULL AND (id = '66cba6e5-bd7a-4bfc-8f32-d1643bb75c92' OR nombre = 'Rrhh')
    """)
    op.execute("""
        UPDATE roles SET tipo = 'Auditor_itss'::tipo_rol_enum
        WHERE empresa_id IS NULL AND (id = '6ce13799-4042-40a4-9165-ece37dcc75f6' OR nombre = 'Auditor_itss')
    """)
    op.execute("""
        UPDATE roles SET tipo = 'Representante_legal'::tipo_rol_enum
        WHERE empresa_id IS NULL AND (id = '92c1919b-742a-492a-8421-97cea9d8b2bd' OR nombre = 'Representante_legal')
    """)
    op.execute("""
        UPDATE roles SET tipo = 'Admin_empresa'::tipo_rol_enum
        WHERE empresa_id IS NULL AND (id = 'b470ce6f-6a3a-4c73-a0c2-4bd2db48218f' OR nombre = 'Admin_empresa')
    """)
    op.execute("""
        UPDATE roles SET tipo = 'Admin_gestoría'::tipo_rol_enum
        WHERE empresa_id IS NULL AND (id = 'f8e554c6-cb9a-45dd-8c49-f4b6a38cfac8' OR nombre = 'Admin_gestoría')
    """)


def downgrade() -> None:
    op.execute("""
        DELETE FROM roles_permisos rp
        USING permisos p
        WHERE rp.permiso_id = p.id AND p.alcance <> 'empresa'::alcance_permiso_enum
    """)
    op.execute("DELETE FROM permisos WHERE alcance <> 'empresa'::alcance_permiso_enum")
    op.drop_constraint("permisos_tipo_accion_alcance_key", "permisos", type_="unique")
    op.drop_column("permisos", "alcance")
    op.create_unique_constraint(
        "permisos_tipo_accion_key", "permisos", ["tipo", "accion"]
    )
    op.execute("DROP TYPE IF EXISTS alcance_permiso_enum")

    op.drop_column("gestorias_empresas", "permisos_delegados")
    op.drop_column("gestorias_empresas", "permisos_maximos")
    op.drop_index("usuarios_empresas_global_activo_usuario_key", table_name="usuarios_empresas")
    op.drop_constraint("trabajadores_usuario_id_key", "trabajadores", type_="unique")
    op.drop_constraint("trabajadores_usuario_id_fkey", "trabajadores", type_="foreignkey")
    op.drop_column("trabajadores", "usuario_id")
