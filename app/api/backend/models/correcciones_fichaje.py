import datetime
from typing import Optional
import uuid
from sqlalchemy import DateTime, Enum, ForeignKeyConstraint, Index, PrimaryKeyConstraint, Text, Uuid, text
from core.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from models.enums import EstadoCorreccionEnum, TipoCorreccionEnum

class CorreccionesFichaje(Base):
    __tablename__ = 'correcciones_fichaje'
    __table_args__ = (
        ForeignKeyConstraint(['aprobado_por_usuario_id'], ['usuarios.id'], ondelete='RESTRICT', name='correcciones_fichaje_aprobado_por_usuario_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='correcciones_fichaje_empresa_id_fkey'),
        ForeignKeyConstraint(['fichaje_afectado_id'], ['fichajes.id'], ondelete='RESTRICT', name='correcciones_fichaje_fichaje_afectado_id_fkey'),
        ForeignKeyConstraint(['solicitado_por_usuario_id'], ['usuarios.id'], ondelete='RESTRICT', name='correcciones_fichaje_solicitado_por_usuario_id_fkey'),
        ForeignKeyConstraint(['trabajador_id'], ['trabajadores.id'], ondelete='RESTRICT', name='correcciones_fichaje_trabajador_id_fkey'),
        PrimaryKeyConstraint('id', name='correcciones_fichaje_pkey'),
        Index('idx_correcciones_empresa_estado', 'empresa_id', 'estado'),
        Index('idx_correcciones_fichaje_afectado', 'fichaje_afectado_id'),
        {'comment': 'Flujo auditable de altas manuales, modificaciones y anulaciones '
                'de fichajes. Esta tabla SÍ es mutable (estado pasa de pendiente a '
                'aprobada/rechazada), a diferencia de fichajes.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    trabajador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo_correccion: Mapped[TipoCorreccionEnum] = mapped_column(Enum(TipoCorreccionEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_correccion_enum'), nullable=False)
    valor_nuevo: Mapped[dict] = mapped_column(JSONB, nullable=False)
    motivo: Mapped[str] = mapped_column(Text, nullable=False)
    solicitado_por_usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    estado: Mapped[EstadoCorreccionEnum] = mapped_column(Enum(EstadoCorreccionEnum, values_callable=lambda cls: [member.value for member in cls], name='estado_correccion_enum'), nullable=False, server_default=text("'pendiente'::estado_correccion_enum"))
    fecha_solicitud: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    fichaje_afectado_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    valor_anterior: Mapped[Optional[dict]] = mapped_column(JSONB)
    aprobado_por_usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    fecha_resolucion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))

    aprobado_por_usuario: Mapped[Optional['Usuarios']] = relationship('Usuarios', foreign_keys=[aprobado_por_usuario_id], back_populates='correcciones_fichaje_aprobado_por_usuario') # type: ignore
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='correcciones_fichaje') # type: ignore
    fichaje_afectado: Mapped[Optional['Fichajes']] = relationship('Fichajes', back_populates='correcciones_fichaje') # type: ignore
    solicitado_por_usuario: Mapped['Usuarios'] = relationship('Usuarios', foreign_keys=[solicitado_por_usuario_id], back_populates='correcciones_fichaje_solicitado_por_usuario') # type: ignore
    trabajador: Mapped['Trabajadores'] = relationship('Trabajadores', back_populates='correcciones_fichaje') # type: ignore
