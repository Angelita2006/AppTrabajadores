
import datetime
import uuid
from sqlalchemy import DateTime, Enum, PrimaryKeyConstraint, String, UniqueConstraint, Uuid, text
from core.database import Base
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.enums import AccionPermisoEnum, TipoPermisoEnum

class Permisos(Base):
    __tablename__ = 'permisos'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='permisos_pkey'), # Identificador único del permiso
        UniqueConstraint('tipo', 'accion', name='permisos_tipo_accion_key'), # Cada permiso sólo puede tener una única combinación de tipo y accion
        {'comment': 'Permisos que pueden ser asignados a roles para controlar el acceso a funcionalidades del sistema.'},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del permiso.')
   
    tipo: Mapped[TipoPermisoEnum] = mapped_column(Enum(TipoPermisoEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_permiso_enum'), nullable=False, server_default=text("'usuarios'::tipo_permiso_enum"), comment='Recurso o área funcional a la que aplica el permiso.')
    accion: Mapped[AccionPermisoEnum] = mapped_column(Enum(AccionPermisoEnum, values_callable=lambda cls: [member.value for member in cls], name='accion_permiso_enum'), nullable=False, server_default=text("'consultar'::accion_permiso_enum"), comment='Operación autorizada sobre el recurso.')
    descripcion: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment='Descripción del permiso.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de creación de la licencia.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de actualización de la licencia.')

    rol: Mapped[list['Roles']] = relationship('Roles', secondary='roles_permisos', back_populates='permiso', viewonly=True, overlaps='roles_permisos,permiso', doc='Roles que tienen este permiso.') # type: ignore
    roles_permisos: Mapped[list['RolesPermisos']] = relationship('RolesPermisos', back_populates='permiso', overlaps='rol', doc='Relación entre roles y permisos.') # type: ignore
