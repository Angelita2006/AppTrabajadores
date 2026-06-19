import datetime
from typing import Optional
import uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKeyConstraint, PrimaryKeyConstraint, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from backend.models.enums import EstadoAusenciaEnum, TipoAusenciaEnum
from empresas import Empresas
from trabajadores import Trabajadores
from usuarios import Usuarios

class Ausencias(Base):
    __tablename__ = 'ausencias'
    __table_args__ = (
        CheckConstraint('fecha_fin >= fecha_inicio', name='ausencias_fechas_check'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='ausencias_empresa_id_fkey'),
        ForeignKeyConstraint(['trabajador_id'], ['trabajadores.id'], ondelete='RESTRICT', name='ausencias_trabajador_id_fkey'),
        ForeignKeyConstraint(['validado_por_usuario_id'], ['usuarios.id'], ondelete='RESTRICT', name='ausencias_validado_por_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='ausencias_pkey'),
        {'comment': 'Registro centralizado de ausencias, bajas y vacaciones. Requiere validación de RRHH.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    trabajador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    
    tipo_ausencia: Mapped[TipoAusenciaEnum] = mapped_column(Enum(TipoAusenciaEnum, name='tipo_ausencia_enum'), nullable=False)
    estado: Mapped[EstadoAusenciaEnum] = mapped_column(Enum(EstadoAusenciaEnum, name='estado_ausencia_enum'), nullable=False, server_default=text("'pendiente'::estado_ausencia_enum"))
    
    fecha_inicio: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    motivo: Mapped[str] = mapped_column(Text, nullable=False, comment='Explicación o causa legal de la ausencia.')
    
    # Campo JSONB para adjuntar metadatos del justificante (URL del archivo PDF, número de colegiado, etc.)
    justificante_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    
    # Control de auditoría para la resolución de RRHH
    validado_por_usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    fecha_resolucion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    observaciones_admin: Mapped[Optional[str]] = mapped_column(Text, comment='Notas añadidas por el validador al aprobar/rechazar.')

    # Relaciones del ORM
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='ausencias')
    trabajador: Mapped['Trabajadores'] = relationship('Trabajadores', back_populates='ausencias')
    validado_por_usuario: Mapped[Optional['Usuarios']] = relationship('Usuarios', back_populates='ausencias_validadas')