import datetime
import uuid
from sqlalchemy import Boolean, DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, SmallInteger, String, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class CalendariosLaborales(Base):
    __tablename__ = 'calendarios_laborales'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='calendarios_laborales_pkey'), # Identificador único del calendario laboral
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='calendarios_laborales_empresa_id_fkey'), # El calendario laboral debe pertenecer a la misma empresa que el centro de trabajo, si aplica
        UniqueConstraint('empresa_id', 'id', name='calendarios_laborales_empresa_id_id_key'), # Cada calendario laboral es único por empresa
        {'comment': 'Calendarios laborales anuales de ámbito empresarial, independientes de los centros físicos.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del calendario laboral.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece el calendario.')
    
    anio: Mapped[int] = mapped_column(SmallInteger, nullable=False, comment='Año al que corresponde el calendario.')
    nombre: Mapped[str] = mapped_column(String(50), nullable=False, comment='Nombre del calendario laboral.')
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'), comment='Indica si el calendario está activo.')
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de creación del registro.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de la última actualización del registro.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='calendarios_laborales', doc='Empresa a la que pertenece el calendario.') # type: ignore
    
    festivos: Mapped[list['Festivos']] = relationship('Festivos', back_populates='calendario', cascade='all, delete-orphan', doc='Días festivos incluidos en el calendario.') # type: ignore
    contratos: Mapped[list['ContratosCalendarios']] = relationship('ContratosCalendarios', back_populates='calendario_laboral', doc='Contratos asociados al calendario.') # type: ignore
