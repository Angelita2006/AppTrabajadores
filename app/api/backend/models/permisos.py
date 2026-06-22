
from sqlalchemy import Column, ForeignKey, PrimaryKeyConstraint, SmallInteger, String, Table, UniqueConstraint
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

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(255))

    role: Mapped[list['Roles']] = relationship('Roles', secondary='roles_permisos', back_populates='permiso') # type: ignore
