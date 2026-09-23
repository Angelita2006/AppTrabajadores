import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, DateTime, Enum, ForeignKeyConstraint, Index, PrimaryKeyConstraint, String, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import TipoUsuarioEnum

class Usuarios(Base):
    __tablename__ = 'usuarios'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='usuarios_empresa_id_fkey'),
        ForeignKeyConstraint(['trabajador_id'], ['trabajadores.id'], ondelete='RESTRICT', name='usuarios_trabajador_id_fkey'),
        PrimaryKeyConstraint('id', name='usuarios_pkey'),
        UniqueConstraint('trabajador_id', name='usuarios_trabajador_id_key')
    )

    __table_args__ += (
        Index('usuarios_email_activo_key', 'email', unique=True, postgresql_where=text('activo IS TRUE')),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo_usuario: Mapped[TipoUsuarioEnum] = mapped_column(Enum(TipoUsuarioEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_usuario_enum'), nullable=False)
    mfa_habilitado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='NULL para usuarios de la gestoría, administradores de empresa globales o auditores ITSS.')
    trabajador_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    ultimo_acceso: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    
    codigo_recuperacion: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    codigo_expira_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), nullable=True)
    email_pendiente_verificacion = mapped_column(String, nullable=True)
    token_cambio_email = mapped_column(String, nullable=True, unique=True)
    token_cambio_email_expira_at = mapped_column(DateTime(timezone=True), nullable=True)

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='usuarios') # type: ignore
    trabajador: Mapped[Optional['Trabajadores']] = relationship('Trabajadores', back_populates='usuarios') # type: ignore
    auditoria_accesos: Mapped[list['AuditoriaAccesos']] = relationship('AuditoriaAccesos', back_populates='usuario') # type: ignore
    usuarios_roles: Mapped[list['UsuariosRoles']] = relationship('UsuariosRoles', back_populates='usuario') # type: ignore
    correcciones_fichaje_aprobado_por_usuario: Mapped[list['CorreccionesFichaje']] = relationship('CorreccionesFichaje', foreign_keys='[CorreccionesFichaje.aprobado_por_usuario_id]', back_populates='aprobado_por_usuario') # type: ignore
    correcciones_fichaje_solicitado_por_usuario: Mapped[list['CorreccionesFichaje']] = relationship('CorreccionesFichaje', foreign_keys='[CorreccionesFichaje.solicitado_por_usuario_id]', back_populates='solicitado_por_usuario') # type: ignore
    ausencias_validadas: Mapped[list['Ausencias']] = relationship('Ausencias', back_populates='validado_por_usuario') # type: ignore
