from typing import Optional
import uuid
from sqlalchemy import ForeignKeyConstraint, PrimaryKeyConstraint, SmallInteger, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class UsuariosRoles(Base):
    __tablename__ = 'usuarios_roles'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='usuarios_roles_empresa_id_fkey'),
        ForeignKeyConstraint(['rol_id'], ['roles.id'], ondelete='CASCADE', name='usuarios_roles_rol_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE', name='usuarios_roles_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='usuarios_roles_pkey'),
        UniqueConstraint('usuario_id', 'rol_id', 'empresa_id', name='usuarios_roles_usuario_id_rol_id_empresa_id_key')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    rol_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Ámbito estricto del rol: toda asignación requiere una empresa asociada.')

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='usuarios_roles') # type: ignore
    rol: Mapped['Roles'] = relationship('Roles', back_populates='usuarios_roles') # type: ignore
    usuario: Mapped['Usuarios'] = relationship('Usuarios', back_populates='usuarios_roles') # type: ignore
