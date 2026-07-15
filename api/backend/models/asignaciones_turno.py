import datetime
from typing import Optional
import uuid
from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class AsignacionesTurno(Base):
    __tablename__ = 'asignaciones_turno'
    __table_args__ = (
        CheckConstraint('fecha_fin IS NULL OR fecha_fin >= fecha_inicio', name='asignaciones_turno_check'),
        ForeignKeyConstraint(['trabajador_id'], ['trabajadores.id'], ondelete='RESTRICT', name='asignaciones_turno_trabajador_id_fkey'),
        ForeignKeyConstraint(['turno_id'], ['turnos.id'], ondelete='CASCADE', name='asignaciones_turno_turno_id_fkey'),
        PrimaryKeyConstraint('id', name='asignaciones_turno_pkey')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    trabajador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    turno_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    fecha_inicio: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[Optional[datetime.date]] = mapped_column(Date)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))


    trabajador: Mapped['Trabajadores'] = relationship('Trabajadores', back_populates='asignaciones_turno') # type: ignore
    turno: Mapped['Turnos'] = relationship('Turnos', back_populates='asignaciones_turno') # type: ignore
