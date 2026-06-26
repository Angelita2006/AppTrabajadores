from sqlalchemy import Column, ForeignKey, PrimaryKeyConstraint, SmallInteger, String, Table, UniqueConstraint
from core.database import Base
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

roles_permisos = Table(
    "roles_permisos",
    Base.metadata,
    Column("role_id", SmallInteger, ForeignKey("roles.id", ondelete="CASCADE")),
    Column("permiso_id", SmallInteger, ForeignKey("permisos.id", ondelete="CASCADE"))
)

class Roles(Base):
    __tablename__ = 'roles'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='roles_pkey'),
        UniqueConstraint('nombre', name='roles_nombre_key')
    )

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(255))

    permiso: Mapped[list['Permisos']] = relationship('Permisos', secondary='roles_permisos', back_populates='role') # type: ignore
    usuarios_roles: Mapped[list['UsuariosRoles']] = relationship('UsuariosRoles', back_populates='role') # type: ignore
