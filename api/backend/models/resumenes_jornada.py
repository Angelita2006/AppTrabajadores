import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, Date, DateTime, ForeignKeyConstraint, Index, Integer, PrimaryKeyConstraint, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class ResumenesJornada(Base):
    __tablename__ = 'resumenes_jornada'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='resumenes_jornada_pkey'), # Identificador único del resumen de jornada
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='resumenes_jornada_empresa_id_fkey'), # Identificador de la empresa a la que pertenece el resumen
        ForeignKeyConstraint(['empresa_id', 'trabajador_id'], ['trabajadores.empresa_id', 'trabajadores.id'], ondelete='RESTRICT', name='resumenes_jornada_empresa_trabajador_fkey'), # Identificador de la empresa y el trabajador al que corresponde el resumen
        UniqueConstraint('trabajador_id', 'fecha', name='resumenes_jornada_trabajador_id_fecha_key'), # Combinación única de trabajador y fecha
        Index('idx_resumenes_empresa_fecha', 'empresa_id', 'fecha'), # Índice para optimizar consultas por empresa y fecha
        {'comment': 'Tabla de agregados diarios, recalculada por la aplicación (o un '
                'job) a partir de v_fichajes_vigentes. No sustituye a fichajes '
                'como prueba legal; es una capa de consulta rápida para nómina y '
                'cuadros de mando.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del resumen de jornada.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece el resumen.')
    trabajador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del trabajador al que corresponde el resumen.')
    
    minutos_trabajados: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'), comment='Total de minutos trabajados en la jornada.')
    minutos_pausa: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'), comment='Total de minutos de pausa en la jornada.')
    minutos_extra: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'), comment='Total de minutos extra trabajados en la jornada.')
    tiene_incidencias: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'), comment='Indica si el resumen tiene alguna incidencia.')
    cerrado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'), comment='Indica si el resumen está cerrado.')
    
    hora_entrada: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), nullable=True, comment='Hora de entrada del trabajador.')
    hora_salida: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), nullable=True, comment='Hora de salida del trabajador.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de creación del resumen.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de la última actualización del resumen.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='resumenes_jornada', doc='Empresa a la que pertenece el resumen.') # type: ignore
    trabajador: Mapped['Trabajadores'] = relationship('Trabajadores', back_populates='resumenes_jornada', doc='Trabajador al que corresponde el resumen.') # type: ignore
