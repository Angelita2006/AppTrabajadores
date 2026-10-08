import datetime
import uuid
from sqlalchemy import ARRAY, Boolean, CheckConstraint, ForeignKeyConstraint, PrimaryKeyConstraint, SmallInteger, String, DateTime, Time, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class Turnos(Base):
    __tablename__ = 'turnos'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='turnos_pkey'), # Identificador único del turno
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='turnos_empresa_id_fkey'), # Identificador de la empresa a la que pertenece el turno; NULL para turno global
        CheckConstraint('dias_semana <@ ARRAY[1::smallint, 2::smallint, 3::smallint, 4::smallint, 5::smallint, 6::smallint, 7::smallint]', name='dias_semana_validos'), # Los días de la semana deben estar en el rango 1-7, donde 1=lunes y 7=domingo
        UniqueConstraint('empresa_id', 'id', name='turnos_empresa_id_id_key'), # Clave única para turnos por empresa; permite turnos globales (empresa_id = NULL) y turnos propios de empresa (empresa_id = valor)
        {'comment': 'Turnos de trabajo que pueden ser asignados a los trabajadores; pueden ser turnos globales (empresa_id = NULL) o turnos propios de una empresa (empresa_id = valor).'},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del turno.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece el turno; NULL para turno global.')
    
    nombre: Mapped[str] = mapped_column(String(150), nullable=False, comment='Nombre del turno.')
    hora_inicio: Mapped[datetime.time] = mapped_column(Time, nullable=False, comment='Hora de inicio del turno.')
    hora_fin: Mapped[datetime.time] = mapped_column(Time, nullable=False, comment='Hora de fin del turno.')
    duracion_pausa_minutos: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('0'), comment='Duración de la pausa en minutos para este turno; se puede usar para calcular el tiempo efectivo de trabajo.')
    dias_semana: Mapped[list[int]] = mapped_column(ARRAY(SmallInteger()), nullable=False, server_default=text("'{1,2,3,4,5}'"), comment='Días de la semana en que aplica el turno: 1=lunes ... 7=domingo.')
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'), comment='Indica si el turno está activo; los turnos inactivos no se pueden asignar a trabajadores.')
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de creación del turno.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de actualización del turno.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='turnos', doc='Empresa a la que pertenece el turno.') # type: ignore

    asignaciones_turno: Mapped[list['AsignacionesTurno']] = relationship('AsignacionesTurno', back_populates='turno', doc='Asignaciones de este turno a los trabajadores.') # type: ignore
