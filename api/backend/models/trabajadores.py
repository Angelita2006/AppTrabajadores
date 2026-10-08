import datetime
from enum import Enum
from typing import Optional
import uuid
from sqlalchemy import Boolean, Date, ForeignKeyConstraint, Index, PrimaryKeyConstraint, String, DateTime, Text, UniqueConstraint, Uuid, CheckConstraint, text, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import EstadoTrabajadorEnum

class Trabajadores(Base):
    __tablename__ = 'trabajadores'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='trabajadores_pkey'), # Identificador único del trabajador
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='trabajadores_empresa_id_fkey'), # Identificador de la empresa a la que pertenece el trabajador
        ForeignKeyConstraint(['rol_id'], ['roles.id'], ondelete='SET NULL', name='trabajadores_rol_id_fkey'), # Identificador del rol de acceso del trabajador; NULL si no tiene rol asignado
        CheckConstraint("dni_nif_nie ~ '^[XYZ0-9][0-9]{7}[A-Za-z]$'", name='check_dni_nif_nie_formato_valido'), # Verifica que el DNI/NIF/NIE tenga un formato válido
        UniqueConstraint('empresa_id', 'id', name='trabajadores_empresa_id_id_key'), # Combinación única de empresa y trabajador
        UniqueConstraint('empresa_id', 'dni_nif_nie', name='trabajadores_empresa_id_dni_nif_nie_key'), # Combinación única de empresa y DNI/NIF/NIE
        {'comment': 'Trabajadores de cada empresa cliente. El derecho de supresión '
                    '(art. 17 RGPD) no aplica mientras existan fichajes en periodo de '
                    'conservación legal (excepción art. 17.3.b RGPD); en su lugar se '
                    'usa activo/fecha_baja_empresa.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del trabajador.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece el trabajador.')
    rol_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='Identificador del rol de acceso del trabajador; NULL si no tiene rol asignado.')

    dni_nif_nie: Mapped[str] = mapped_column(String(9), nullable=False, comment='DNI, NIF o NIE del trabajador; único por empresa.')
    nombre: Mapped[str] = mapped_column(String(50), nullable=False, comment='Nombre del trabajador.')
    apellidos: Mapped[str] = mapped_column(String(100), nullable=False, comment='Apellidos del trabajador.')
    numero_seguridad_social: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, comment='Número de la Seguridad Social del trabajador; único por empresa si no es nulo.')
    fecha_nacimiento: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True, comment='Fecha de nacimiento del trabajador.')
    foto_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment='URL de la foto del trabajador; se puede usar para identificación visual en fichajes.')

    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'), comment='Indica si el trabajador está activo; se usa para cumplir con el derecho de supresión (art. 17 RGPD) mientras existan fichajes en periodo de conservación legal.')
    estado: Mapped[EstadoTrabajadorEnum] = mapped_column(Enum(EstadoTrabajadorEnum, values_callable=lambda cls: [member.value for member in cls], name='estado_trabajador_enum'), nullable=False, server_default="Inactivo", comment="Estado operativo actual del trabajador")

    fecha_alta_empresa: Mapped[datetime.date] = mapped_column(Date, nullable=False, server_default=text('CURRENT_DATE'), comment='Fecha de alta del trabajador en la empresa; se usa para cumplir con el derecho de supresión (art. 17 RGPD) mientras existan fichajes en periodo de conservación legal.')
    fecha_baja_empresa: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True, comment='Fecha de baja del trabajador en la empresa; se usa para cumplir con el derecho de supresión (art. 17 RGPD) mientras existan fichajes en periodo de conservación legal.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de creación del trabajador.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de actualización del trabajador.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='trabajadores', doc='Empresa a la que pertenece el trabajador.') # type: ignore
    rol: Mapped[Optional['Roles']] = relationship('Roles', foreign_keys=[rol_id], doc='Rol del trabajador.') # type: ignore

    asignaciones_turno: Mapped[list['AsignacionesTurno']] = relationship('AsignacionesTurno', back_populates='trabajador', doc='Asignaciones de turno del trabajador.') # type: ignore
    resumenes_jornada: Mapped[list['ResumenesJornada']] = relationship('ResumenesJornada', back_populates='trabajador', doc='Resúmenes de jornada del trabajador.') # type: ignore
    usuario: Mapped[Optional['Usuarios']] = relationship('Usuarios', uselist=False, back_populates='trabajador', doc='Usuario asociado al trabajador.') # type: ignore
    auditoria_accesos: Mapped[list['AuditoriaAccesos']] = relationship('AuditoriaAccesos', back_populates='trabajador', doc='Registros de auditoría de accesos del trabajador.') # type: ignore
    contratos: Mapped[list['Contratos']] = relationship('Contratos', back_populates='trabajador', doc='Contratos del trabajador.') # type: ignore
    fichajes: Mapped[list['Fichajes']] = relationship('Fichajes', back_populates='trabajador', doc='Fichajes del trabajador.') # type: ignore
    correcciones_fichaje: Mapped[list['CorreccionesFichaje']] = relationship('CorreccionesFichaje', back_populates='trabajador', doc='Correcciones de fichajes del trabajador.') # type: ignore
    ausencias: Mapped[list['Ausencias']] = relationship('Ausencias', back_populates='trabajador', doc='Ausencias del trabajador.') # type: ignore