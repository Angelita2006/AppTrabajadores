import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKeyConstraint, PrimaryKeyConstraint, String, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import TipoFestivoEnum

class Festivos(Base):
    __tablename__ = 'festivos'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='festivos_pkey'), # Identificador único del festivo
        ForeignKeyConstraint(['calendario_id'], ['calendarios_laborales.id'], ondelete='CASCADE', name='festivos_calendario_id_fkey'), # El festivo pertenece a un calendario laboral
        UniqueConstraint('calendario_id', 'fecha', name='festivos_calendario_id_fecha_key'), # Cada festivo es único por calendario laboral y fecha
        {'comment': 'Festivos asociados a calendarios laborales.'},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del festivo.')
    calendario_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del calendario laboral al que pertenece el festivo.')

    fecha: Mapped[datetime.date] = mapped_column(Date, nullable=False, comment='Fecha del festivo.')
    tipo: Mapped[TipoFestivoEnum] = mapped_column(Enum(TipoFestivoEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_festivo_enum'), nullable=False, server_default=text("'Local'::tipo_festivo_enum"), comment='Tipo de festivo.')
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'), comment='Indica si el festivo está activo.')
    descripcion: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment='Descripción del festivo.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de creación del festivo.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de actualización del festivo.')

    calendario: Mapped['CalendariosLaborales'] = relationship('CalendariosLaborales', back_populates='festivos', doc='Calendario laboral al que pertenece el festivo.') # type: ignore
