import uuid
from sqlalchemy import ForeignKeyConstraint, PrimaryKeyConstraint, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base

class ContratosCalendarios(Base):
    __tablename__ = 'contratos_calendarios'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='contratos_calendarios_pkey', comment='Identificador único de la relación contrato-calendario.'),
        ForeignKeyConstraint(
            ['empresa_id', 'centro_trabajo_id', 'contrato_id'],
            ['contratos.empresa_id', 'contratos.centro_trabajo_id', 'contratos.id'],
            ondelete='CASCADE',
            name='contratos_calendarios_contrato_centro_fkey',
            comment='La relación contrato-calendario debe pertenecer al mismo contrato y centro de trabajo, si aplica.'
        ),
        ForeignKeyConstraint(
            ['empresa_id', 'centro_trabajo_id', 'calendario_id'],
            ['calendarios_laborales.empresa_id', 'calendarios_laborales.centro_trabajo_id', 'calendarios_laborales.id'],
            ondelete='RESTRICT',
            name='contratos_calendarios_calendario_centro_fkey',
            comment='La relación contrato-calendario debe pertenecer al mismo calendario y centro de trabajo, si aplica.'
        ),
        UniqueConstraint('contrato_id', 'calendario_id', name='contratos_calendarios_contrato_calendario_key', comment='Cada contrato puede tener un único calendario asociado por año.'),
        {'comment': 'Asocia a cada contrato el calendario anual de su centro aplicable a cada año de vigencia.'},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único de la relación contrato-calendario.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece el contrato y el calendario.')
    centro_trabajo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del centro de trabajo al que pertenece el contrato y el calendario.')
    contrato_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del contrato al que pertenece la relación.')
    calendario_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del calendario laboral asociado.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='contratos_calendarios', comment='Empresa a la que pertenece la relación.')  # type: ignore
    centro_trabajo: Mapped['CentrosTrabajo'] = relationship('CentrosTrabajo', back_populates='contratos_calendarios', comment='Centro de trabajo al que pertenece la relación.')  # type: ignore
    contrato: Mapped['Contratos'] = relationship('Contratos', back_populates='calendarios_asociados', comment='Contrato al que pertenece la relación.')  # type: ignore
    calendario: Mapped['CalendariosLaborales'] = relationship('CalendariosLaborales', back_populates='contratos_asociados', comment='Calendario laboral al que pertenece la relación.')  # type: ignore
