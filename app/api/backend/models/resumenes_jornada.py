import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, Date, DateTime, ForeignKeyConstraint, Index, Integer, PrimaryKeyConstraint, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from empresas import Empresas
from trabajadores import Trabajadores

class ResumenesJornada(Base):
    __tablename__ = 'resumenes_jornada'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='resumenes_jornada_empresa_id_fkey'),
        ForeignKeyConstraint(['trabajador_id'], ['trabajadores.id'], ondelete='RESTRICT', name='resumenes_jornada_trabajador_id_fkey'),
        PrimaryKeyConstraint('id', name='resumenes_jornada_pkey'),
        UniqueConstraint('trabajador_id', 'fecha', name='resumenes_jornada_trabajador_id_fecha_key'),
        Index('idx_resumenes_empresa_fecha', 'empresa_id', 'fecha'),
        {'comment': 'Tabla de agregados diarios, recalculada por la aplicación (o un '
                'job) a partir de v_fichajes_vigentes. No sustituye a fichajes '
                'como prueba legal; es una capa de consulta rápida para nómina y '
                'cuadros de mando.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    trabajador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    fecha: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    minutos_trabajados: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    minutos_pausa: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    minutos_extra: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    tiene_incidencia: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    cerrado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    actualizado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    hora_entrada: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    hora_salida: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='resumenes_jornada')
    trabajador: Mapped['Trabajadores'] = relationship('Trabajadores', back_populates='resumenes_jornada')

    