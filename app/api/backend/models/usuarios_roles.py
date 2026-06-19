from typing import Optional
import uuid
from sqlalchemy import ForeignKeyConstraint, PrimaryKeyConstraint, SmallInteger, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class UsuariosRoles(Base):
    __tablename__ = 'usuarios_roles'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='usuarios_roles_empresa_id_fkey'),
        ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE', name='usuarios_roles_role_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE', name='usuarios_roles_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='usuarios_roles_pkey'),
        UniqueConstraint('usuario_id', 'role_id', 'empresa_id', name='usuarios_roles_usuario_id_role_id_empresa_id_key')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    role_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, comment='Ámbito del rol. NULL = aplica a todas las empresas que gestiona el usuario (típico de personal de gestoría).')

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='usuarios_roles') # type: ignore
    role: Mapped['Roles'] = relationship('Roles', back_populates='usuarios_roles') # type: ignore
    usuario: Mapped['Usuarios'] = relationship('Usuarios', back_populates='usuarios_roles') # type: ignore
