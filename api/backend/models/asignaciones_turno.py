import datetime
from typing import Optional
import uuid
from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base

class AsignacionesTurno(Base):
    __tablename__ = 'asignaciones_turno'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='asignaciones_turno_pkey'), # Identificador único de la asignación de turno
        ForeignKeyConstraint(['empresa_id', 'trabajador_id'], ['trabajadores.empresa_id', 'trabajadores.id'], ondelete='RESTRICT', name='asignaciones_turno_empresa_trabajador_fkey'), # La asignación de turno debe pertenecer al mismo trabajador y empresa.
        ForeignKeyConstraint(['empresa_id', 'turno_id'], ['turnos.empresa_id', 'turnos.id'], ondelete='CASCADE', name='asignaciones_turno_empresa_turno_fkey'), # La asignación de turno debe pertenecer al mismo turno y empresa
        CheckConstraint('fecha_fin IS NULL OR fecha_fin >= fecha_inicio', name='asignaciones_turno_check'), # La fecha de fin debe ser mayor o igual a la fecha de inicio, si aplica
        {'comment': 'Asigna un turno a un trabajador durante un periodo de tiempo. '
                    'Si fecha_fin es NULL, la asignación es indefinida hasta que se '
                    'asigne otro turno o se desasigne el turno actual.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único de la asignación de turno.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Empresa común del trabajador y del turno asignado.')
    trabajador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del trabajador al que se le asigna el turno.')
    turno_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del turno que se asigna.')
    
    fecha_inicio: Mapped[datetime.date] = mapped_column(Date, nullable=False, comment='Fecha de inicio de la asignación.')
    fecha_fin: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True, comment='Fecha de fin de la asignación.')
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de creación de la asignación.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='asignaciones_turno', doc='Empresa a la que pertenece la asignación de turno.') # type: ignore
    trabajador: Mapped['Trabajadores'] = relationship('Trabajadores', back_populates='asignaciones_turno', doc='Trabajador al que se le asigna el turno.') # type: ignore
    turno: Mapped['Turnos'] = relationship('Turnos', back_populates='asignaciones_turno', doc='Turno que se asigna.') # type: ignore
