import datetime
from typing import Optional
import uuid
from sqlalchemy import DateTime, Enum, ForeignKeyConstraint, Index, PrimaryKeyConstraint, String, Text, Uuid, text
from core.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from core.enums import EstadoCorreccionEnum, TipoCorreccionEnum, TipoEventoFichajeEnum

class CorreccionesFichaje(Base):
    __tablename__ = 'correcciones_fichaje'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='correcciones_fichaje_pkey', comment='Identificador único de la corrección de fichaje.'),
        ForeignKeyConstraint(['aprobado_por_usuario_id'], ['usuarios.id'], ondelete='RESTRICT', name='correcciones_fichaje_aprobado_por_usuario_id_fkey', comment='Usuario que aprueba la corrección.'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='correcciones_fichaje_empresa_id_fkey', comment='Empresa a la que pertenece la corrección.'),
        ForeignKeyConstraint(['solicitado_por_usuario_id'], ['usuarios.id'], ondelete='RESTRICT', name='correcciones_fichaje_solicitado_por_usuario_id_fkey', comment='Usuario que solicita la corrección.'),
        ForeignKeyConstraint(['empresa_id', 'trabajador_id'], ['trabajadores.empresa_id', 'trabajadores.id'], ondelete='RESTRICT', name='correcciones_fichaje_empresa_trabajador_fkey', comment='Relación con el trabajador afectado.'),
        ForeignKeyConstraint(['empresa_id', 'trabajador_id', 'fichaje_afectado_id'], ['fichajes.empresa_id', 'fichajes.trabajador_id', 'fichajes.id'], ondelete='RESTRICT', name='correcciones_fichaje_fichaje_mismo_trabajador_fkey', comment='Fichaje afectado por la corrección.'),
        Index('idx_correcciones_empresa_estado', 'empresa_id', 'estado', comment='Índice para consultas de correcciones por empresa y estado.'),
        Index('idx_correcciones_fichaje_afectado', 'fichaje_afectado_id', comment='Índice para consultas de correcciones por fichaje afectado.'),
        {'comment': 'Flujo auditable de altas manuales, modificaciones y anulaciones '
                    'de fichajes. Esta tabla SÍ es mutable (estado pasa de pendiente a '
                    'aprobada/rechazada), a diferencia de fichajes.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único de la corrección de fichaje.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece la corrección.')
    trabajador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del trabajador al que corresponde la corrección.')
    aprobado_por_usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='Identificador del usuario que aprueba la corrección.')
    solicitado_por_usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del usuario que solicita la corrección.')
    fichaje_afectado_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='Identificador del fichaje afectado por la corrección.')

    tipo_evento: Mapped[TipoEventoFichajeEnum] = mapped_column(Enum(TipoEventoFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_evento_fichaje_enum', create_type=False), nullable=False, comment='Tipo fijo del evento de fichaje de la corrección.')
    tipo_correccion: Mapped[TipoCorreccionEnum] = mapped_column(Enum(TipoCorreccionEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_correccion_enum'), nullable=False, comment='Tipo de corrección.')
    
    valor_nuevo: Mapped[dict] = mapped_column(JSONB, nullable=False, comment='Valor nuevo de la corrección.')
    valor_anterior: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, comment='Valor anterior de la corrección.')
    
    estado: Mapped[EstadoCorreccionEnum] = mapped_column(Enum(EstadoCorreccionEnum, values_callable=lambda cls: [member.value for member in cls], name='estado_correccion_enum'), nullable=False, server_default=text("'Pendiente'::estado_correccion_enum"), comment='Estado de la corrección.')
    motivo: Mapped[str] = mapped_column(String(255), nullable=False, comment='Motivo de la corrección.')

    fecha_solicitud: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de la solicitud de la corrección.')
    fecha_resolucion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), nullable=True, comment='Fecha y hora de la resolución de la corrección.')

    firma_solicitante: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment='Ruta de la firma digital de quien solicita la corrección.')
    firma_resolutor: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment='Ruta de la firma digital de quien resuelve la corrección.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='correcciones_fichaje', comment='Empresa a la que pertenece la corrección.') # type: ignore
    trabajador: Mapped['Trabajadores'] = relationship('Trabajadores', back_populates='correcciones_fichaje', comment='Trabajador al que corresponde la corrección.') # type: ignore
    aprobado_por_usuario: Mapped[Optional['Usuarios']] = relationship('Usuarios', foreign_keys=[aprobado_por_usuario_id], back_populates='correcciones_fichaje_aprobado_por_usuario', comment='Usuario que aprueba la corrección.') # type: ignore
    solicitado_por_usuario: Mapped['Usuarios'] = relationship('Usuarios', foreign_keys=[solicitado_por_usuario_id], back_populates='correcciones_fichaje_solicitado_por_usuario', comment='Usuario que solicita la corrección.') # type: ignore
    fichaje_afectado: Mapped[Optional['Fichajes']] = relationship('Fichajes', back_populates='correcciones_fichaje', comment='Fichaje afectado por la corrección.') # type: ignore
