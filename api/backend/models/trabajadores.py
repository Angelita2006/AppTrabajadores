import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, Date, ForeignKeyConstraint, Index, PrimaryKeyConstraint, String, DateTime, Text, UniqueConstraint, Uuid, CheckConstraint, text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import EstadoTrabajadorEnum

class Trabajadores(Base):
    __tablename__ = 'trabajadores'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='trabajadores_empresa_id_fkey'),
        ForeignKeyConstraint(['rol_id'], ['roles.id'], ondelete='SET NULL', name='trabajadores_rol_id_fkey'),
        PrimaryKeyConstraint('id', name='trabajadores_pkey'),
        UniqueConstraint('empresa_id', 'dni_nif_nie', name='trabajadores_empresa_id_dni_nif_nie_key'),
        Index('trabajadores_email_activo_key', 'email', unique=True, postgresql_where=text('activo IS TRUE AND email IS NOT NULL')),
        CheckConstraint("dni_nif_nie ~ '^[XYZ0-9][0-9]{7}[A-Za-z]$'", name='check_dni_nif_nie_formato_valido'),
        CheckConstraint("email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'", name='check_email_formato_valido'),
        {'comment': 'Trabajadores de cada empresa cliente. El derecho de supresión '
                    '(art. 17 RGPD) no aplica mientras existan fichajes en periodo de '
                    'conservación legal (excepción art. 17.3.b RGPD); en su lugar se '
                    'usa activo/fecha_baja_empresa.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    dni_nif_nie: Mapped[str] = mapped_column(String(9), nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(150), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    estado: Mapped[EstadoTrabajadorEnum] = mapped_column(SQLEnum(EstadoTrabajadorEnum, name="estadotrabajadorenum", native_enum=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False, server_default="Inactivo", comment="Estado operativo actual del trabajador")
    fecha_alta_empresa: Mapped[datetime.date] = mapped_column(Date, nullable=False, server_default=text('CURRENT_DATE'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    telefono: Mapped[Optional[str]] = mapped_column(String(30))
    numero_seguridad_social: Mapped[Optional[str]] = mapped_column(String(20))
    fecha_nacimiento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    fecha_baja_empresa: Mapped[Optional[datetime.date]] = mapped_column(Date)
    foto_url: Mapped[Optional[str]] = mapped_column(Text)
    rol_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='trabajadores') # type: ignore
    rol: Mapped[Optional['Roles']] = relationship('Roles', foreign_keys=[rol_id]) # type: ignore
    asignaciones_turno: Mapped[list['AsignacionesTurno']] = relationship('AsignacionesTurno', back_populates='trabajador') # type: ignore
    resumenes_jornada: Mapped[list['ResumenesJornada']] = relationship('ResumenesJornada', back_populates='trabajador') # type: ignore
    usuarios: Mapped[Optional['Usuarios']] = relationship('Usuarios', uselist=False, back_populates='trabajador') # type: ignore
    auditoria_accesos: Mapped[list['AuditoriaAccesos']] = relationship('AuditoriaAccesos', back_populates='trabajador') # type: ignore
    contratos: Mapped[list['Contratos']] = relationship('Contratos', back_populates='trabajador') # type: ignore
    fichajes: Mapped[list['Fichajes']] = relationship('Fichajes', back_populates='trabajador') # type: ignore
    correcciones_fichaje: Mapped[list['CorreccionesFichaje']] = relationship('CorreccionesFichaje', back_populates='trabajador') # type: ignore
    ausencias: Mapped[list['Ausencias']] = relationship('Ausencias', back_populates='trabajador') # type: ignore