import uuid
from sqlalchemy import ForeignKeyConstraint, PrimaryKeyConstraint, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base

class UsuariosRoles(Base):
    __tablename__ = 'usuarios_roles'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='usuarios_roles_pkey', comment='Identificador único de la relación usuario-rol.'),
        ForeignKeyConstraint(
            ['usuario_id', 'empresa_id'],
            ['usuarios_empresas.usuario_id', 'usuarios_empresas.empresa_id'],
            ondelete='CASCADE',
            name='usuarios_roles_membresia_fkey',
            comment='Identificador de la membresía usuario-empresa a la que pertenece la relación usuario-rol; un usuario puede tener un único rol por empresa.',
        ),
        ForeignKeyConstraint(['rol_id'], ['roles.id'], ondelete='CASCADE', name='usuarios_roles_rol_id_fkey', comment='Identificador del rol al que pertenece la relación usuario-rol.'),
        UniqueConstraint('usuario_id', 'rol_id', 'empresa_id', name='usuarios_roles_usuario_rol_empresa_key', comment='Combinación única de usuario, rol y empresa; un usuario puede tener un único rol por empresa.'),
        {'comment': 'Relación entre usuarios y roles; un usuario puede tener un único rol por empresa.'},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único de la relación usuario-rol.')
    usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del usuario al que pertenece la relación usuario-rol.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece la relación usuario-rol.')
    rol_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del rol al que pertenece la relación usuario-rol.')

    usuario: Mapped['Usuarios'] = relationship('Usuarios', back_populates='usuarios_roles', comment='Usuario al que pertenece la relación usuario-rol.')  # type: ignore
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='usuarios_roles', comment='Empresa a la que pertenece la relación usuario-rol.')  # type: ignore
    rol: Mapped['Roles'] = relationship('Roles', back_populates='usuarios_roles', comment='Rol al que pertenece la relación usuario-rol.')  # type: ignore