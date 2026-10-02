import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, DateTime, Index, PrimaryKeyConstraint, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class Usuarios(Base):
    __tablename__ = 'usuarios'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='usuarios_pkey', comment='Identificador único del usuario.'),
        Index('usuarios_email_activo_key', 'email', unique=True, postgresql_where=text('activo IS TRUE')),
        Index('usuarios_telefono_activo_key', 'telefono', unique=True, postgresql_where=text('activo IS TRUE')),
        {'comment': 'Usuarios de la aplicación; pueden ser trabajadores, administradores de empresa o usuarios de sistema.'},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del usuario.')
    
    nombre: Mapped[str] = mapped_column(String(150), nullable=False, comment='Nombre completo del usuario.')
    email: Mapped[str] = mapped_column(String(255), nullable=False, comment='Dirección de correo electrónico del usuario.')    
    telefono: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, comment='Número de teléfono del usuario.')
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, comment='Hash de la contraseña del usuario.')
    mfa_habilitado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'), comment='Indica si el usuario tiene habilitada la autenticación de dos factores.')
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'), comment='Indica si el usuario está activo.')
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de creación del usuario.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de actualización del usuario.')
    ultimo_acceso: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), nullable=True, comment='Fecha del último acceso del usuario.')

    codigo_recuperacion: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, comment='Código de recuperación para restablecimiento de contraseña.')
    codigo_expira_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), nullable=True, comment='Fecha de expiración del código de recuperación.')

    email_pendiente_verificacion = mapped_column(String, nullable=True, comment='Dirección de correo electrónico pendiente de verificación.')
    token_cambio_email = mapped_column(String, nullable=True, unique=True, comment='Token para cambiar la dirección de correo electrónico.')
    token_cambio_email_expira_at = mapped_column(DateTime(timezone=True), nullable=True, comment='Fecha de expiracion del token para cambiar el correo electrónico.')

    telefono_pendiente_verificacion = mapped_column(String(30), nullable=True, comment='Número de teléfono pendiente de verificación.')
    token_cambio_telefono = mapped_column(String(255), nullable=True, unique=True, comment='Token para cambiar el número de teléfono.')
    token_cambio_telefono_expira_at = mapped_column(DateTime(timezone=True), nullable=True, comment='Fecha de expiración del token para cambiar el número de teléfono.')

    usuarios_empresas: Mapped[list['UsuariosEmpresas']] = relationship('UsuariosEmpresas', back_populates='usuario', comment='Relación con las empresas a las que tiene acceso el usuario.') # type: ignore
    empresas_admin: Mapped[list['Empresas']] = relationship('Empresas', foreign_keys='[Empresas.usuario_admin_id]', back_populates='usuario_admin', comment='Empresas que administra el usuario.') # type: ignore
    auditoria_accesos: Mapped[list['AuditoriaAccesos']] = relationship('AuditoriaAccesos', back_populates='usuario', comment='Auditoría de accesos del usuario.') # type: ignore
    usuarios_roles: Mapped[list['UsuariosRoles']] = relationship('UsuariosRoles', back_populates='usuario', comment='Roles asignados al usuario.') # type: ignore
    correcciones_fichaje_aprobado_por_usuario: Mapped[list['CorreccionesFichaje']] = relationship('CorreccionesFichaje', foreign_keys='[CorreccionesFichaje.aprobado_por_usuario_id]', back_populates='aprobado_por_usuario', comment='Correcciones de fichaje aprobadas por el usuario.') # type: ignore
    correcciones_fichaje_solicitado_por_usuario: Mapped[list['CorreccionesFichaje']] = relationship('CorreccionesFichaje', foreign_keys='[CorreccionesFichaje.solicitado_por_usuario_id]', back_populates='solicitado_por_usuario', comment='Correcciones de fichaje solicitadas por el usuario.') # type: ignore
    ausencias_validadas: Mapped[list['Ausencias']] = relationship('Ausencias', back_populates='validado_por_usuario', comment='Ausencias validadas por el usuario.') # type: ignore
