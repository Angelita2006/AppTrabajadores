import datetime
import decimal
from typing import Optional
import uuid
from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKeyConstraint, Index, Numeric, PrimaryKeyConstraint, SmallInteger, String, Text, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import EstadoFichajeEnum, MetodoFichajeEnum, OrigenFichajeEnum, TipoEventoFichajeEnum

class Fichajes(Base):
    __tablename__ = 'fichajes'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='fichajes_pkey'), # Identificador único del fichaje
        ForeignKeyConstraint(['empresa_id', 'centro_trabajo_id'], ['centros_trabajo.empresa_id', 'centros_trabajo.id'], ondelete='RESTRICT', name='fichajes_empresa_centro_fkey'), # El fichaje debe pertenecer a la misma empresa que el centro de trabajo y el dispositivo, si aplica
        ForeignKeyConstraint(['empresa_id', 'dispositivo_id'], ['dispositivos_fichaje.empresa_id', 'dispositivos_fichaje.id'], ondelete='RESTRICT', name='fichajes_empresa_dispositivo_fkey'), # El fichaje debe pertenecer a la misma empresa que el centro de trabajo y el dispositivo, si aplica
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='fichajes_empresa_id_fkey'), # El fichaje debe pertenecer a la misma empresa que el centro de trabajo y el dispositivo, si aplica
        ForeignKeyConstraint(['empresa_id', 'trabajador_id', 'fichaje_sustituido_id'], ['fichajes.empresa_id', 'fichajes.trabajador_id', 'fichajes.id'], ondelete='RESTRICT', name='fichajes_sustitucion_mismo_trabajador_fkey'), # El fichaje sustituido debe pertenecer al mismo trabajador
        ForeignKeyConstraint(['motivo_pausa_id'], ['motivos_pausa.id'], ondelete='RESTRICT', name='fichajes_motivo_pausa_id_fkey'), # El motivo de pausa debe existir en la tabla motivos_pausa, si aplica
        ForeignKeyConstraint(['empresa_id', 'trabajador_id'], ['trabajadores.empresa_id', 'trabajadores.id'], ondelete='RESTRICT', name='fichajes_empresa_trabajador_fkey'), # El fichaje debe pertenecer al mismo trabajador y empresa
        UniqueConstraint('empresa_id', 'trabajador_id', 'id', name='fichajes_empresa_trabajador_id_key'), # Cada fichaje es único por empresa y trabajador
        CheckConstraint("latitud >= '-90'::integer::numeric AND latitud <= 90::numeric", name='fichajes_latitud_check'), # La latitud debe estar entre -90 y 90 grados, si aplica
        CheckConstraint("longitud >= '-180'::integer::numeric AND longitud <= 180::numeric", name='fichajes_longitud_check'), # La longitud debe estar entre -180 y 180 grados, si aplica
        Index('idx_fichajes_centro_fecha', 'centro_trabajo_id', 'fecha_hora'), # Índice para consultas de fichajes por centro de trabajo y fecha
        Index('idx_fichajes_empresa_fecha', 'empresa_id', 'fecha_hora'), # Índice para consultas de fichajes por empresa y fecha
        Index('idx_fichajes_sustituido', 'fichaje_sustituido_id', postgresql_where='(fichaje_sustituido_id IS NOT NULL)'), # Índice para consultas de fichajes sustituidos
        Index('idx_fichajes_trabajador_fecha', 'trabajador_id', 'fecha_hora'), # Índice para consultas de fichajes por trabajador y fecha
        {'comment': 'Registro de jornada. Tabla INMUTABLE (append-only): ver triggers '
                'de bloqueo de UPDATE/DELETE más abajo. Cualquier corrección se '
                'gestiona en correcciones_fichaje, opcionalmente insertando una '
                'nueva fila que referencia fichaje_sustituido_id.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'), comment='Identificador único del fichaje.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece el fichaje.')
    trabajador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del trabajador al que pertenece el fichaje.')
    centro_trabajo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del centro de trabajo donde se registró el fichaje.')
    dispositivo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=True, comment='Identificador del dispositivo desde el que se realizó el fichaje, si aplica.')
    fichaje_sustituido_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='Identificador del fichaje que se sustituye, si aplica.')
    motivo_pausa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='Identificador del motivo de la pausa, si aplica.')

    tipo_evento: Mapped[TipoEventoFichajeEnum] = mapped_column(Enum(TipoEventoFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_evento_fichaje_enum'), nullable=False, server_default=text("'ENTRADA'::tipo_evento_fichaje_enum"), comment='Tipo fijo del evento de fichaje.')
    metodo_fichaje: Mapped[MetodoFichajeEnum] = mapped_column(Enum(MetodoFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='metodo_fichaje_enum'), nullable=False, server_default=text("'Manual'::metodo_fichaje_enum"), comment='Método de fichaje.')

    fecha_hora: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, comment='Instante oficial del fichaje (referencia legal).')
    fecha_hora_dispositivo: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=True, comment="Fecha y hora declarada por el dispositivo al registrar el evento.")
    
    origen: Mapped[OrigenFichajeEnum] = mapped_column(Enum(OrigenFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='origen_fichaje_enum'), nullable=False, server_default=text("'Trabajador'::origen_fichaje_enum"), comment='Origen del fichaje.')
    estado: Mapped[EstadoFichajeEnum] = mapped_column(Enum(EstadoFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='estado_fichaje_enum'), nullable=False, server_default=text("'Válido'::estado_fichaje_enum"), comment='Estado del fichaje.')
    
    latitud: Mapped[decimal.Decimal] = mapped_column(Numeric(9, 6), nullable=True, comment='Latitud geográfica del fichaje, si aplica.')
    longitud: Mapped[decimal.Decimal] = mapped_column(Numeric(9, 6), nullable=True, comment='Longitud geográfica del fichaje, si aplica.')
    ip_address: Mapped[str] = mapped_column(String(50), nullable=True, comment='Dirección IP desde la que se realizó el fichaje, si aplica.')
    
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment='Observaciones adicionales sobre el fichaje.')
    firma_digital: Mapped[str] = mapped_column(Text, nullable=False, comment='Firma digitalizada obligatoria en Base64 o URL del archivo.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Momento real de inserción en el sistema (no editable); es la prueba temporal frente a fecha_hora, que puede haberse fijado manualmente en una corrección.')

    hash_integridad: Mapped[str] = mapped_column(String(64), nullable=False, comment='SHA-256 calculado automáticamente sobre los campos clave del registro (ver trigger calcular_hash_fichaje), para evidenciar manipulación.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='fichajes', doc='Empresa a la que pertenece el fichaje.') # type: ignore
    trabajador: Mapped['Trabajadores'] = relationship('Trabajadores', back_populates='fichajes', doc='Trabajador al que pertenece el fichaje.') # type: ignore
    centro_trabajo: Mapped['CentrosTrabajo'] = relationship('CentrosTrabajo', back_populates='fichajes', doc='Centro de trabajo donde se registró el fichaje.') # type: ignore
    dispositivo: Mapped[Optional['DispositivosFichaje']] = relationship('DispositivosFichaje', back_populates='fichajes', doc='Dispositivo desde el que se realizó el fichaje, si aplica.') # type: ignore
    fichaje_sustituido: Mapped[Optional['Fichajes']] = relationship('Fichajes', remote_side=[id], back_populates='fichaje_sustituido_reverse', doc='Fichaje que se sustituye, si aplica.')
    fichaje_sustituido_reverse: Mapped[list['Fichajes']] = relationship('Fichajes', remote_side=[fichaje_sustituido_id], back_populates='fichaje_sustituido', doc='Fichajes que sustituyen a este, si aplica.')
    motivo_pausa: Mapped[Optional['MotivosPausa']] = relationship('MotivosPausa', back_populates='fichajes', doc='Motivo de la pausa, si aplica.') # type: ignore
    
    correcciones_fichaje: Mapped[list['CorreccionesFichaje']] = relationship('CorreccionesFichaje', back_populates='fichaje_afectado', doc='Correcciones aplicadas al fichaje.') # type: ignore
