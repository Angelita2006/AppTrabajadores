import datetime
import uuid
from sqlalchemy import DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base

class RolesPermisos(Base):
    __tablename__ = 'roles_permisos'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='roles_permisos_pkey'), # Identificador único de la relación rol-permiso
        ForeignKeyConstraint(['rol_id'], ['roles.id'], ondelete='RESTRICT', name='roles_permisos_rol_id_fkey'), # Identificador del rol al que pertenece la relación rol-permiso
        ForeignKeyConstraint(['permiso_id'], ['permisos.id'], ondelete='RESTRICT', name='roles_permisos_permiso_id_fkey'), # Identificador del permiso al que pertenece la relación rol-permiso
        {'comment': 'Relación entre roles y permisos; un rol puede tener múltiples permisos y un permiso puede pertenecer a múltiples roles.'},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único de la relación rol-permiso.')
    rol_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del rol al que pertenece la relación rol-permiso.')
    permiso_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del permiso al que pertenece la relación rol-permiso.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de creación de la relación rol-permiso.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de la última actualización de la relación rol-permiso.')

    rol: Mapped["Roles"] = relationship("Roles", back_populates="roles_permisos", overlaps="permiso", doc='Rol al que pertenece la relación rol-permiso.') # type: ignore
    permiso: Mapped["Permisos"] = relationship("Permisos", back_populates="roles_permisos", overlaps="rol", doc='Permiso al que pertenece la relación rol-permiso.') # type: ignore