import datetime
import uuid
from sqlalchemy import ARRAY, CheckConstraint, ForeignKeyConstraint, PrimaryKeyConstraint, SmallInteger, String, DateTime, Time, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class Turnos(Base):
    __tablename__ = 'turnos'
    __table_args__ = (
        CheckConstraint('dias_semana <@ ARRAY[1::smallint, 2::smallint, 3::smallint, 4::smallint, 5::smallint, 6::smallint, 7::smallint]', name='dias_semana_validos'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='turnos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='turnos_pkey'),
        { 'extend_existing': True }
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    hora_inicio: Mapped[datetime.time] = mapped_column(Time, nullable=False)
    hora_fin: Mapped[datetime.time] = mapped_column(Time, nullable=False)
    duracion_pausa_minutos: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('0'))
    dias_semana: Mapped[list[int]] = mapped_column(ARRAY(SmallInteger()), nullable=False, comment='Días de la semana en que aplica el turno: 1=lunes ... 7=domingo.')
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='turnos') # type: ignore
    asignaciones_turno: Mapped[list['AsignacionesTurno']] = relationship('AsignacionesTurno', back_populates='turno') # type: ignore
