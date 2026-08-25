import datetime
import decimal
from typing import Optional
import uuid
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Enum, ForeignKeyConstraint, Numeric, PrimaryKeyConstraint, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import TipoContratoEnum, TipoJornadaEnum

class Contratos(Base):
    __tablename__ = 'contratos'
    __table_args__ = (
        CheckConstraint('fecha_fin IS NULL OR fecha_fin >= fecha_inicio', name='contratos_check'),
        CheckConstraint('horas_semana > 0::numeric', name='contratos_horas_semana_check'),
        ForeignKeyConstraint(['calendario_laboral_id'], ['calendarios_laborales.id'], ondelete='SET NULL', name='contratos_calendario_laboral_id_fkey'),        ForeignKeyConstraint(['centro_trabajo_id'], ['centros_trabajo.id'], ondelete='RESTRICT', name='contratos_centro_trabajo_id_fkey'),
        ForeignKeyConstraint(['departamento_id'], ['departamentos.id'], ondelete='SET NULL', name='contratos_departamento_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='contratos_empresa_id_fkey'),
        ForeignKeyConstraint(['trabajador_id'], ['trabajadores.id'], ondelete='RESTRICT', name='contratos_trabajador_id_fkey'),
        PrimaryKeyConstraint('id', name='contratos_pkey')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    trabajador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    centro_trabajo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    calendario_laboral_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    tipo_contrato: Mapped[TipoContratoEnum] = mapped_column(Enum(TipoContratoEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_contrato_enum'), nullable=False)
    tipo_jornada: Mapped[TipoJornadaEnum] = mapped_column(Enum(TipoJornadaEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_jornada_enum'), nullable=False)
    horas_semana: Mapped[decimal.Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    fecha_inicio: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    departamento_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    puesto_trabajo: Mapped[Optional[str]] = mapped_column(String(150))
    categoria_profesional: Mapped[Optional[str]] = mapped_column(String(150))
    fecha_fin: Mapped[Optional[datetime.date]] = mapped_column(Date)

    centro_trabajo: Mapped['CentrosTrabajo'] = relationship('CentrosTrabajo', back_populates='contratos') # type: ignore
    departamento: Mapped[Optional['Departamentos']] = relationship('Departamentos', back_populates='contratos') # type: ignore
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='contratos') # type: ignore
    trabajador: Mapped['Trabajadores'] = relationship('Trabajadores', back_populates='contratos') # type: ignore
    calendario_laboral: Mapped[Optional['CalendariosLaborales']] = relationship('CalendariosLaborales') # type: ignore