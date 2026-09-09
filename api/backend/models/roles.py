import uuid
from typing import Optional
from sqlalchemy import PrimaryKeyConstraint, String, UniqueConstraint, Uuid
from core.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from models.roles_permisos import RolesPermisos

class Roles(Base):
    __tablename__ = 'roles'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='roles_pkey'),
        UniqueConstraint('nombre', name='roles_nombre_key')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(255))

    permiso: Mapped[list['Permisos']] = relationship('Permisos', secondary='roles_permisos', back_populates='rol', viewonly=True, overlaps='roles_permisos,rol') # type: ignore
    usuarios_roles: Mapped[list['UsuariosRoles']] = relationship('UsuariosRoles', back_populates='rol') # type: ignore
    roles_permisos: Mapped[list['RolesPermisos']] = relationship('RolesPermisos', back_populates='rol', overlaps='permiso') # type: ignore