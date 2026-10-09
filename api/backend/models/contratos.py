import datetime
import decimal
from typing import Optional
import uuid
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Enum, ForeignKeyConstraint, Index, Numeric, PrimaryKeyConstraint, String, Text, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import TipoContratoEnum, TipoJornadaEnum

class Contratos(Base):
    __tablename__ = 'contratos'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='contratos_pkey'), # Identificador único del contrato
        ForeignKeyConstraint(['empresa_id', 'centro_trabajo_id'], ['centros_trabajo.empresa_id', 'centros_trabajo.id'], ondelete='RESTRICT', name='contratos_empresa_centro_fkey'), # El contrato debe pertenecer a la misma empresa y centro de trabajo
        ForeignKeyConstraint(['empresa_id', 'departamento_id'], ['departamentos.empresa_id', 'departamentos.id'], ondelete='RESTRICT', name='contratos_empresa_departamento_fkey'), # El contrato debe pertenecer al mismo departamento
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='contratos_empresa_id_fkey'), # El contrato debe pertenecer a la misma empresa
        ForeignKeyConstraint(['empresa_id', 'trabajador_id'], ['trabajadores.empresa_id', 'trabajadores.id'], ondelete='RESTRICT', name='contratos_empresa_trabajador_fkey'), # El contrato debe pertenecer a la misma empresa y trabajador
        UniqueConstraint('empresa_id', 'centro_trabajo_id', 'id', name='contratos_empresa_centro_id_key'), # Cada contrato es único por empresa y centro de trabajo
        Index('contratos_un_activo_por_trabajador_empresa_key', 'empresa_id', 'trabajador_id', unique=True, postgresql_where=text('activo IS TRUE')), # Cada trabajador puede tener un único contrato activo por empresa
        CheckConstraint('fecha_fin IS NULL OR fecha_fin >= fecha_inicio', name='contratos_check'), # La fecha de fin del contrato debe ser mayor o igual a la fecha de inicio, si aplica
        CheckConstraint('horas_semana > 0::numeric', name='contratos_horas_semana_check'), # El número de horas semanales del contrato debe ser mayor que cero
        {'comment': 'Contratos de trabajo de los trabajadores. Incluye información sobre el tipo de contrato, jornada, horas semanales, fechas de inicio y fin, y otros detalles relevantes.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del contrato.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece el contrato.')
    trabajador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del trabajador al que corresponde el contrato.')
    centro_trabajo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del centro de trabajo al que pertenece el contrato.')
    departamento_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Departamento al que pertenece el contrato.')
    
    tipo_contrato: Mapped[TipoContratoEnum] = mapped_column(Enum(TipoContratoEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_contrato_enum'), nullable=False, server_default=text("'Temporal'::tipo_contrato_enum"), comment='Tipo de contrato.')
    tipo_jornada: Mapped[TipoJornadaEnum] = mapped_column(Enum(TipoJornadaEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_jornada_enum'), nullable=False, server_default=text("'Completa'::tipo_jornada_enum"), comment='Tipo de jornada.')
    horas_semana: Mapped[decimal.Decimal] = mapped_column(Numeric(5, 2), nullable=False, comment='Número de horas semanales del contrato.')
    puesto_trabajo: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment='Puesto de trabajo del contratado.')
    categoria_profesional: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment='Categoría profesional del contratado.')

    pdf_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment='URL o ruta del archivo PDF oficial del contrato.')

    fecha_inicio: Mapped[datetime.date] = mapped_column(Date, nullable=False, comment='Fecha de inicio del contrato.')
    fecha_fin: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True, comment='Fecha de fin del contrato. Si es NULL, el contrato está activo hasta que se indique lo contrario.')
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'), comment='Indica si el contrato está activo.')
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de creación del contrato.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de la última actualización del contrato.')
    
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='contratos', doc='Empresa a la que pertenece el contrato.') # type: ignore
    trabajador: Mapped['Trabajadores'] = relationship('Trabajadores', back_populates='contratos', doc='Trabajador al que corresponde el contrato.') # type: ignore
    centro_trabajo: Mapped['CentrosTrabajo'] = relationship('CentrosTrabajo', back_populates='contratos', doc='Centro de trabajo al que pertenece el contrato.') # type: ignore
    departamento: Mapped[Optional['Departamentos']] = relationship('Departamentos', back_populates='contratos', doc='Departamento al que pertenece el contrato.') # type: ignore
    
    calendarios_laborales: Mapped[list['ContratosCalendarios']] = relationship('ContratosCalendarios', back_populates='contrato', cascade='all, delete-orphan', doc='Calendarios laborales pertenecientes al contrato.') # type: ignore
    asignaciones_turno: Mapped[list['AsignacionesTurno']] = relationship('AsignacionesTurno', back_populates='contrato', doc='Asignaciones de turno del contrato.') # type: ignore
