from typing import Optional
import uuid
from sqlalchemy import ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base

class RolesPermisos(Base):
    __tablename__ = 'roles_permisos'

    rol_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permiso_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("permisos.id", ondelete="CASCADE"), primary_key=True)
        
    rol: Mapped["Roles"] = relationship("Roles", back_populates="roles_permisos", overlaps="permiso") # type: ignore
    permiso: Mapped["Permisos"] = relationship("Permisos", back_populates="roles_permisos", overlaps="rol") # type: ignore