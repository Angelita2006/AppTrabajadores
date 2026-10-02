import uuid
from sqlalchemy import CheckConstraint, Enum, ForeignKeyConstraint, Index, PrimaryKeyConstraint, SmallInteger, Uuid, text
from core.database import Base
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import AccionRetencionEnum

class PoliticasRetencion(Base):
    __tablename__ = 'politicas_retencion'
    __table_args__ = (
        CheckConstraint('anios_conservacion >= 4', name='politicas_retencion_anios_conservacion_check'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='politicas_retencion_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='politicas_retencion_pkey'),
        Index('politicas_retencion_unica_global_key', text('(1)'), unique=True, postgresql_where=text('empresa_id IS NULL')),
        Index('politicas_retencion_unica_por_empresa_key', 'empresa_id', unique=True, postgresql_where=text('empresa_id IS NOT NULL')),
        {'comment': 'Política global de retención (empresa_id NULL) y overrides empresariales que nunca deben reducir el mínimo global.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='NULL = política global por defecto; con valor = política propia de una empresa.')

    anios_conservacion: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('4'))
    accion_tras_periodo: Mapped[AccionRetencionEnum] = mapped_column(Enum(AccionRetencionEnum, values_callable=lambda cls: [member.value for member in cls], name='accion_retencion_enum'), nullable=False, server_default=text("'Archivar'::accion_retencion_enum"))

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='politicas_retencion') # type: ignore
