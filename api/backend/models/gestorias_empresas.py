import datetime
import uuid
from typing import Optional
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKeyConstraint, Index, PrimaryKeyConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base

class GestoriasEmpresas(Base):
    __tablename__ = 'gestorias_empresas'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='gestorias_empresas_pkey', comment='Identificador único de la relación gestoría-empresa cliente.'),
        ForeignKeyConstraint(['gestoria_empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='gestorias_empresas_gestoria_empresa_id_fkey', comment='Identificador de la empresa que actúa como gestoría.'),
        ForeignKeyConstraint(['empresa_cliente_id'], ['empresas.id'], ondelete='RESTRICT', name='gestorias_empresas_empresa_cliente_id_fkey', comment='Identificador de la empresa cliente sobre la que tiene autorización la gestoría.'),
        ForeignKeyConstraint(['usuario_creador_id'], ['usuarios.id'], ondelete='SET NULL', name='gestorias_empresas_usuario_creador_id_fkey', comment='Identificador del usuario que creó la autorización.'),
        CheckConstraint('gestoria_empresa_id <> empresa_cliente_id', name='gestorias_empresas_empresas_distintas_check', comment='La gestoría y la empresa cliente deben ser entidades diferentes.'),
        CheckConstraint('fecha_fin IS NULL OR fecha_fin >= fecha_inicio', name='gestorias_empresas_fechas_check', comment='La fecha de finalización debe ser mayor o igual que la fecha de inicio.'),
        Index('gestorias_empresas_gestoria_activo_idx', 'gestoria_empresa_id', 'activo', comment='Índice para consultas de gestorías activas.'),
        Index('gestorias_empresas_cliente_activo_idx', 'empresa_cliente_id', 'activo', comment='Índice para consultas de empresas cliente activas.'),
        Index(
            'gestorias_empresas_vinculo_activo_key',
            'gestoria_empresa_id',
            'empresa_cliente_id',
            unique=True,
            postgresql_where=text('activo IS TRUE'),
            comment='Índice único para asegurar que no existan múltiples autorizaciones activas entre la misma gestoría y empresa cliente.'
        ),
        {'comment': 'Autorizaciones vigentes e históricas de gestorías sobre empresas cliente.'},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único de la relación gestoría-empresa cliente.')
    gestoria_empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa que actúa como gestoría.')
    empresa_cliente_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa cliente.')
    usuario_creador_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='Identificador del usuario que creó la autorización.')
    fecha_inicio: Mapped[datetime.date] = mapped_column(Date, nullable=False, server_default=text('CURRENT_DATE'), comment='Fecha de inicio de la autorización.')
    fecha_fin: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True, comment='Fecha de finalización de la autorización.')
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'), comment='Indica si la autorización está activa.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de creación de la autorización.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de actualización de la autorización.')

    gestoria: Mapped['Empresas'] = relationship('Empresas', foreign_keys=[gestoria_empresa_id], back_populates='gestorias_como_gestora', comment='Gestoría a la que pertenece la autorización.')  # type: ignore
    empresa_cliente: Mapped['Empresas'] = relationship('Empresas', foreign_keys=[empresa_cliente_id], back_populates='gestorias_como_cliente', comment='Empresa cliente sobre la que tiene autorización la gestoría.')  # type: ignore