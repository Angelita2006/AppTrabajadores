import datetime
import uuid
from typing import Optional
from sqlalchemy import DateTime, Enum, ForeignKeyConstraint, Index, PrimaryKeyConstraint, String, Uuid, text
from core.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.enums import TipoRolEnum
from models.roles_permisos import RolesPermisos

class Roles(Base):
    __tablename__ = 'roles'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='roles_pkey'), # Identificador único del rol
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='CASCADE', name='roles_empresa_id_fkey'), # Identificador de la empresa a la que pertenece el rol; NULL para rol de sistema
        Index('roles_nombre_global_key', 'nombre', unique=True, postgresql_where=text('empresa_id IS NULL')), # Índice único para roles globales (empresa_id = NULL)
        Index('roles_empresa_nombre_key', 'empresa_id', 'nombre', unique=True, postgresql_where=text('empresa_id IS NOT NULL')), # Índice único para roles personalizados de empresa (empresa_id IS NOT NULL)
        {'comment': 'Roles de acceso a la aplicación; pueden ser roles globales (empresa_id = NULL) o roles personalizados de empresa (empresa_id = valor).'},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del rol.')
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='NULL para rol de sistema; con empresa_id es un rol personalizado de esa empresa.')
    
    nombre: Mapped[str] = mapped_column(String(50), nullable=False, comment='Nombre del rol; único por empresa o global (empresa_id = NULL).')
    tipo: Mapped[TipoRolEnum] = mapped_column(Enum(TipoRolEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_rol_enum'), nullable=False, server_default=text("'Otro'::tipo_rol_enum"), comment='Tipo de rol.')
    descripcion: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment='Descripción del rol.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de creación del rol.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de la última actualización del rol.')

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='roles', doc='Empresa a la que pertenece el rol.') # type: ignore

    permiso: Mapped[list['Permisos']] = relationship('Permisos', secondary='roles_permisos', back_populates='rol', viewonly=True, overlaps='roles_permisos,rol', doc='Permisos asociados al rol.') # type: ignore
    usuarios_roles: Mapped[list['UsuariosRoles']] = relationship('UsuariosRoles', back_populates='rol', doc='Usuarios asignados al rol.') # type: ignore
    usuarios_empresas: Mapped[list['UsuariosEmpresas']] = relationship('UsuariosEmpresas', back_populates='rol', doc='Usuarios asignados al rol.') # type: ignore
    roles_permisos: Mapped[list['RolesPermisos']] = relationship('RolesPermisos', back_populates='rol', overlaps='permiso', doc='Relación entre roles y permisos.') # type: ignore