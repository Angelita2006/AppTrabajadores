import datetime
import uuid
from sqlalchemy import DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base

class ContratosCalendarios(Base):
    __tablename__ = 'contratos_calendarios'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='contratos_calendarios_pkey'), # Identificador único de la relación contrato-calendario
        ForeignKeyConstraint(['empresa_id', 'centro_trabajo_id', 'contrato_id'], ['contratos.empresa_id', 'contratos.centro_trabajo_id', 'contratos.id'], ondelete='CASCADE', name='contratos_calendarios_contrato_centro_fkey'), # La relación contrato-calendario debe pertenecer al mismo contrato y centro de trabajo, si aplica
        ForeignKeyConstraint(['empresa_id', 'centro_trabajo_id', 'calendario_laboral_id'], ['calendarios_laborales.empresa_id', 'calendarios_laborales.centro_trabajo_id', 'calendarios_laborales.id'], ondelete='RESTRICT', name='contratos_calendarios_calendario_centro_fkey'), # La relación contrato-calendario debe pertenecer al mismo calendario y centro de trabajo, si aplica
        UniqueConstraint('contrato_id', 'calendario_laboral_id', name='contratos_calendarios_contrato_calendario_key'), # Cada contrato puede tener un único calendario asociado por año
        {'comment': 'Asocia a cada contrato el calendario anual de su centro aplicable a cada año de vigencia.'},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único de la relación contrato-calendario.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece el contrato y el calendario.')
    centro_trabajo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del centro de trabajo al que pertenece el contrato y el calendario.')
    contrato_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del contrato al que pertenece la relación.')
    calendario_laboral_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del calendario laboral asociado.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de creación de la relación contrato-calendario.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de la última actualización de la relación contrato-calendario.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='contratos_calendarios', doc='Empresa a la que pertenece la relación.')  # type: ignore
    centro_trabajo: Mapped['CentrosTrabajo'] = relationship('CentrosTrabajo', back_populates='contratos_calendarios', doc='Centro de trabajo al que pertenece la relación.')  # type: ignore
    contrato: Mapped['Contratos'] = relationship('Contratos', back_populates='calendarios_asociados', doc='Contrato al que pertenece la relación.')  # type: ignore
    calendario_laboral: Mapped['CalendariosLaborales'] = relationship('CalendariosLaborales', back_populates='contratos_asociados', doc='Calendario laboral al que pertenece la relación.')  # type: ignore
