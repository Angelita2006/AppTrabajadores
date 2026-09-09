"""Actualizar modelos y tipos de id y roles base

Revision ID: be47ceaeca8d
Revises: 8286b3c1ab45
Create Date: 2026-08-25 18:04:14.124716

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be47ceaeca8d'
down_revision: Union[str, Sequence[str], None] = '8286b3c1ab45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Ajustes en fichajes (ya adaptado a UUID previamente)
    op.alter_column('fichajes', 'tipo_evento_id',
               existing_type=sa.UUID(),
               nullable=True)
    
    # Manejar de forma segura la llave foránea si existe
    try:
        op.drop_constraint(op.f('fichajes_tipo_evento_id_fkey'), 'fichajes', type_='foreignkey')
    except Exception:
        pass
        
    op.create_foreign_key('fichajes_tipo_evento_id_fkey', 'fichajes', 'tipos_evento_fichaje', ['tipo_evento_id'], ['id'], ondelete='RESTRICT')

    # 2. Eliminar dependencias / llaves foráneas de usuarios_roles antes de cambiar tipos
    try:
        op.drop_constraint('usuarios_roles_rol_id_fkey', 'usuarios_roles', type_='foreignkey')
    except Exception:
        pass

    # 3. Transformar 'permisos.id' a UUID generando un UUID aleatorio por cada registro numérico existente
    op.alter_column('permisos', 'id',
               existing_type=sa.SMALLINT(),
               type_=sa.Uuid(),
               existing_nullable=False,
               postgresql_using='gen_random_uuid()',
               existing_server_default=sa.text("nextval('permisos_id_seq'::regclass)"))

    # 4. Transformar 'roles.id' a UUID generando un UUID único por cada rol existente
    op.alter_column('roles', 'id',
               existing_type=sa.SMALLINT(),
               type_=sa.Uuid(),
               existing_nullable=False,
               postgresql_using='gen_random_uuid()',
               existing_server_default=sa.text("nextval('roles_id_seq'::regclass)"))

    # 5. Transformar 'usuarios_roles.rol_id' a UUID asegurando que mapee correctamente
    op.alter_column('usuarios_roles', 'rol_id',
               existing_type=sa.SMALLINT(),
               type_=sa.Uuid(),
               existing_nullable=False,
               postgresql_using='gen_random_uuid()')

    # 6. Volver a crear la llave foránea en usuarios_roles apuntando al nuevo id UUID de roles
    op.create_foreign_key('usuarios_roles_rol_id_fkey', 'usuarios_roles', 'roles', ['rol_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    """Downgrade schema."""
    # En caso de revertir, pasamos de nuevo a smallint si fuese necesario
    op.drop_constraint('usuarios_roles_rol_id_fkey', 'usuarios_roles', type_='foreignkey')
    op.alter_column('usuarios_roles', 'rol_id',
               existing_type=sa.Uuid(),
               type_=sa.SMALLINT(),
               existing_nullable=False)
    op.alter_column('roles', 'id',
               existing_type=sa.Uuid(),
               type_=sa.SMALLINT(),
               existing_nullable=False,
               existing_server_default=sa.text("nextval('roles_id_seq'::regclass)"))
    op.alter_column('permisos', 'id',
               existing_type=sa.Uuid(),
               type_=sa.SMALLINT(),
               existing_nullable=False,
               existing_server_default=sa.text("nextval('permisos_id_seq'::regclass)"))
    op.drop_constraint('fichajes_tipo_evento_id_fkey', 'fichajes', type_='foreignkey')
    op.create_foreign_key(op.f('fichajes_tipo_evento_id_fkey'), 'fichajes', 'tipos_evento_fichaje', ['tipo_evento_id'], ['id'])
    op.alter_column('fichajes', 'tipo_evento_id',
               existing_type=sa.UUID(),
               nullable=False)