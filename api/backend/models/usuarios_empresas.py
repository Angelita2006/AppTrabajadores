import datetime
import uuid
from sqlalchemy import Boolean, DateTime, ForeignKeyConstraint, Index, PrimaryKeyConstraint, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base

class UsuariosEmpresas(Base):
    __tablename__ = 'usuarios_empresas'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='usuarios_empresas_pkey', comment='Identificador único de la relación de usuario-empresa.'),
        ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE', name='usuarios_empresas_usuario_id_fkey', comment='Identificador del usuario al que pertenece la relación de usuario-empresa.'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='usuarios_empresas_empresa_id_fkey', comment='Identificador de la empresa a la que pertenece la relación de usuario-empresa.'),
        ForeignKeyConstraint(['rol_id'], ['roles.id'], ondelete='RESTRICT', name='usuarios_empresas_rol_id_fkey', comment='Identificador del rol de acceso de este usuario en esta empresa; un usuario puede tener un único rol por empresa.'),
        UniqueConstraint('usuario_id', 'empresa_id', name='usuarios_empresas_usuario_id_empresa_id_key', comment='Combinación única de usuario y empresa; un usuario puede tener un único rol por empresa.'),
        Index('usuarios_empresas_empresa_activo_idx', 'empresa_id', 'activo', comment='Índice para consultas de usuarios activos en una empresa.'),
        {'comment': 'Membresías y acceso de usuarios a empresas; los roles se asignan por separado.'},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único de la relación usuario-empresa.')
    usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del usuario.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa.')
    rol_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Único rol de acceso de este usuario en esta empresa.')
    
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'), comment='Indica si la relación es activa.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de creación de la relación.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de actualización de la relación.')

    usuario: Mapped['Usuarios'] = relationship('Usuarios', back_populates='usuarios_empresas', comment='Usuario al que pertenece la relación.')  # type: ignore
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='usuarios_empresas', comment='Empresa a la que tiene acceso el usuario.')  # type: ignore
    rol: Mapped['Roles'] = relationship('Roles', back_populates='usuarios_empresas')  # type: ignore