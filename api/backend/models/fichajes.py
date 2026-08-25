import datetime
import decimal
from typing import Any, Optional
import uuid
from sqlalchemy import INT, CheckConstraint, DateTime, Enum, ForeignKeyConstraint, Index, Numeric, PrimaryKeyConstraint, SmallInteger, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import EstadoFichajeEnum, MetodoFichajeEnum, OrigenFichajeEnum

class Fichajes(Base):
    __tablename__ = 'fichajes'
    __table_args__ = (
        CheckConstraint("latitud >= '-90'::integer::numeric AND latitud <= 90::numeric", name='fichajes_latitud_check'),
        CheckConstraint("longitud >= '-180'::integer::numeric AND longitud <= 180::numeric", name='fichajes_longitud_check'),
        ForeignKeyConstraint(['centro_trabajo_id'], ['centros_trabajo.id'], ondelete='RESTRICT', name='fichajes_centro_trabajo_id_fkey'),
        ForeignKeyConstraint(['dispositivo_id'], ['dispositivos_fichaje.id'], ondelete='SET NULL', name='fichajes_dispositivo_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='fichajes_empresa_id_fkey'),
        ForeignKeyConstraint(['fichaje_sustituido_id'], ['fichajes.id'], ondelete='RESTRICT', name='fichajes_fichaje_sustituido_id_fkey'),
        ForeignKeyConstraint(['motivo_pausa_id'], ['motivos_pausa.id'], ondelete='RESTRICT', name='fichajes_motivo_pausa_id_fkey'),
        ForeignKeyConstraint(['tipo_evento_id'], ['tipos_evento_fichaje.id'], ondelete='RESTRICT', name='fichajes_tipo_evento_id_fkey'),
        ForeignKeyConstraint(['trabajador_id'], ['trabajadores.id'], ondelete='RESTRICT', name='fichajes_trabajador_id_fkey'),
        PrimaryKeyConstraint('id', name='fichajes_pkey'),
        Index('idx_fichajes_centro_fecha', 'centro_trabajo_id', 'fecha_hora'),
        Index('idx_fichajes_empresa_fecha', 'empresa_id', 'fecha_hora'),
        Index('idx_fichajes_sustituido', 'fichaje_sustituido_id', postgresql_where='(fichaje_sustituido_id IS NOT NULL)'),
        Index('idx_fichajes_trabajador_fecha', 'trabajador_id', 'fecha_hora'),
        {'comment': 'Registro de jornada. Tabla INMUTABLE (append-only): ver triggers '
                'de bloqueo de UPDATE/DELETE más abajo. Cualquier corrección se '
                'gestiona en correcciones_fichaje, opcionalmente insertando una '
                'nueva fila que referencia fichaje_sustituido_id.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    trabajador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    centro_trabajo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo_evento_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    fecha_hora: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, comment='Instante oficial del fichaje (referencia legal).')
    metodo_fichaje: Mapped[MetodoFichajeEnum] = mapped_column(Enum(MetodoFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='metodo_fichaje_enum'), nullable=False)
    origen: Mapped[OrigenFichajeEnum] = mapped_column(Enum(OrigenFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='origen_fichaje_enum'), nullable=False, server_default=text("'Trabajador'::origen_fichaje_enum"))
    estado: Mapped[EstadoFichajeEnum] = mapped_column(Enum(EstadoFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='estado_fichaje_enum'), nullable=False, server_default=text("'Válido'::estado_fichaje_enum"))
    hash_integridad: Mapped[str] = mapped_column(String(64), nullable=False, comment='SHA-256 calculado automáticamente sobre los campos clave del registro (ver trigger calcular_hash_fichaje), para evidenciar manipulación.')
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Momento real de inserción en el sistema (no editable); es la prueba temporal frente a fecha_hora, que puede haberse fijado manualmente en una corrección.')
    motivo_pausa_id: Mapped[Optional[int]] = mapped_column(SmallInteger)
    fecha_hora_dispositivo: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), comment='Hora reportada por el dispositivo/app del trabajador; permite detectar desincronización o manipulación del reloj local.')
    dispositivo_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    latitud: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(9, 6))
    longitud: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(9, 6))
    ip_address: Mapped[Optional[Any]] = mapped_column(INT)
    fichaje_sustituido_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    observaciones: Mapped[Optional[str]] = mapped_column(Text)

    centro_trabajo: Mapped['CentrosTrabajo'] = relationship('CentrosTrabajo', back_populates='fichajes') # type: ignore
    dispositivo: Mapped[Optional['DispositivosFichaje']] = relationship('DispositivosFichaje', back_populates='fichajes') # type: ignore
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='fichajes') # type: ignore
    fichaje_sustituido: Mapped[Optional['Fichajes']] = relationship('Fichajes', remote_side=[id], back_populates='fichaje_sustituido_reverse')
    fichaje_sustituido_reverse: Mapped[list['Fichajes']] = relationship('Fichajes', remote_side=[fichaje_sustituido_id], back_populates='fichaje_sustituido')
    motivo_pausa: Mapped[Optional['MotivosPausa']] = relationship('MotivosPausa', back_populates='fichajes') # type: ignore
    tipo_evento: Mapped['TiposEventoFichaje'] = relationship('TiposEventoFichaje', back_populates='fichajes') # type: ignore
    trabajador: Mapped['Trabajadores'] = relationship('Trabajadores', back_populates='fichajes') # type: ignore
    correcciones_fichaje: Mapped[list['CorreccionesFichaje']] = relationship('CorreccionesFichaje', back_populates='fichaje_afectado') # type: ignore
