import datetime
from typing import Optional
import uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKeyConstraint, PrimaryKeyConstraint, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import EstadoAusenciaEnum, TipoAusenciaEnum

class Ausencias(Base):
    __tablename__ = 'ausencias'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='ausencias_pkey', comment='Identificador único de la ausencia.'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='ausencias_empresa_id_fkey', comment='La ausencia debe pertenecer a la misma empresa que el trabajador.'),
        ForeignKeyConstraint(['empresa_id', 'trabajador_id'], ['trabajadores.empresa_id', 'trabajadores.id'], ondelete='RESTRICT', name='ausencias_empresa_trabajador_fkey', comment='La ausencia debe pertenecer a la misma empresa que el trabajador.'),
        ForeignKeyConstraint(['validado_por_usuario_id'], ['usuarios.id'], ondelete='RESTRICT', name='ausencias_validado_por_usuario_id_fkey', comment='Identificador del usuario que valida o resuelve la solicitud de ausencia.'),
        CheckConstraint('fecha_fin >= fecha_inicio', name='ausencias_fechas_check', comment='La fecha de fin debe ser mayor o igual a la fecha de inicio.'),
        {'comment': 'Registra las ausencias de los trabajadores, incluyendo vacaciones, bajas médicas y otros tipos de ausencia. '
                    'Permite a la empresa gestionar y justificar las ausencias de los trabajadores, '}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único de la ausencia.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece la ausencia.')
    trabajador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del trabajador que tiene la ausencia.')
    validado_por_usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='Identificador del usuario que valida o resuelve la solicitud de ausencia.')

    tipo_ausencia: Mapped[TipoAusenciaEnum] = mapped_column(Enum(TipoAusenciaEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_ausencia_enum'), nullable=False, server_default=text("'Ausencia_injustificada'::tipo_ausencia_enum"), comment='Tipo de ausencia (vacaciones, baja médica, etc.).')
    estado: Mapped[EstadoAusenciaEnum] = mapped_column(Enum(EstadoAusenciaEnum, values_callable=lambda cls: [member.value for member in cls], name='estado_ausencia_enum'), nullable=False, server_default=text("'Pendiente'::estado_ausencia_enum"), comment='Estado de la ausencia.')
    
    fecha_inicio: Mapped[datetime.date] = mapped_column(Date, nullable=False, comment='Fecha de inicio de la ausencia.')
    fecha_fin: Mapped[datetime.date] = mapped_column(Date, nullable=False, comment='Fecha de fin de la ausencia.')
    motivo: Mapped[str] = mapped_column(String(255), nullable=False, comment='Explicación o causa legal de la ausencia.')

    justificante_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), comment='Metadatos adicionales sobre el justificante de la ausencia.')
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de creación del registro.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de la última actualización del registro.')
    
    fecha_resolucion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), nullable=True, comment='Fecha en que se resuelve la solicitud de ausencia.')
    observaciones_admin: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment='Notas añadidas por el validador al aprobar/rechazar.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='ausencias', comment='Empresa a la que pertenece la ausencia.') # type: ignore
    trabajador: Mapped['Trabajadores'] = relationship('Trabajadores', back_populates='ausencias', comment='Trabajador que tiene la ausencia.') # type: ignore
    validado_por_usuario: Mapped[Optional['Usuarios']] = relationship('Usuarios', back_populates='ausencias_validadas', comment='Usuario que valida la solicitud de ausencia.') # type: ignore