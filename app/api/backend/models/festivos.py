import datetime
from typing import Optional
import uuid
from sqlalchemy import Date, ForeignKeyConstraint, PrimaryKeyConstraint, String, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class Festivos(Base):
    __tablename__ = 'festivos'
    __table_args__ = (
        ForeignKeyConstraint(['calendario_id'], ['calendarios_laborales.id'], ondelete='CASCADE', name='festivos_calendario_id_fkey'),
        PrimaryKeyConstraint('id', name='festivos_pkey'),
        UniqueConstraint('calendario_id', 'fecha', name='festivos_calendario_id_fecha_key')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    calendario_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    fecha: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False, server_default=text("'nacional'::character varying"))
    descripcion: Mapped[Optional[str]] = mapped_column(String(255))

    calendario: Mapped['CalendariosLaborales'] = relationship('CalendariosLaborales', back_populates='festivos') # type: ignore
