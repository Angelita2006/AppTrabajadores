import datetime
from typing import Optional
import uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

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
    
    tipo_ausencia: Mapped[str] = mapped_column(Text, nullable=False)
    estado: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'Pendiente'"))
    
    fecha_inicio: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    motivo: Mapped[str] = mapped_column(Text, nullable=False, comment='Explicación o causa legal de la ausencia.')
    
    justificante_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    
    validado_por_usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    fecha_resolucion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    observaciones_admin: Mapped[Optional[str]] = mapped_column(Text, comment='Notas añadidas por el validador al aprobar/rechazar.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='ausencias') # type: ignore
    trabajador: Mapped['Trabajadores'] = relationship('Trabajadores', back_populates='ausencias') # type: ignore
    validado_por_usuario: Mapped[Optional['Usuarios']] = relationship('Usuarios', back_populates='ausencias_validadas') # type: ignore