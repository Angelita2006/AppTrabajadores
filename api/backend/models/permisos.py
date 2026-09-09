
import uuid
from sqlalchemy import PrimaryKeyConstraint, String, UniqueConstraint, Uuid
from core.database import Base
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class Permisos(Base):
    __tablename__ = 'permisos'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='permisos_pkey'),
        UniqueConstraint('codigo', name='permisos_codigo_key')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(255))

    rol: Mapped[list['Roles']] = relationship('Roles', secondary='roles_permisos', back_populates='permiso', viewonly=True, overlaps='roles_permisos,permiso') # type: ignore
    roles_permisos: Mapped[list['RolesPermisos']] = relationship('RolesPermisos', back_populates='permiso', overlaps='rol') # type: ignore