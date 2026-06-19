import uuid
from sqlalchemy import CheckConstraint, Enum, ForeignKeyConstraint, PrimaryKeyConstraint, SmallInteger, String, UniqueConstraint, Uuid, text
from core.database import Base
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from enums import AccionRetencionEnum

class PoliticasRetencion(Base):
    __tablename__ = 'politicas_retencion'
    __table_args__ = (
        CheckConstraint('anios_conservacion >= 4', name='politicas_retencion_anios_conservacion_check'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='politicas_retencion_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='politicas_retencion_pkey'),
        UniqueConstraint('empresa_id', name='politicas_retencion_empresa_id_key'),
        {'comment': 'Política de conservación legal (mínimo 4 años, art. 34.9 ET). '
                'empresa_id NULL = política global por defecto aplicada a empresas '
                'sin configuración propia.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    anios_conservacion: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('4'))
    accion_tras_periodo: Mapped[AccionRetencionEnum] = mapped_column(Enum(AccionRetencionEnum, values_callable=lambda cls: [member.value for member in cls], name='accion_retencion_enum'), nullable=False, server_default=text("'archivar'::accion_retencion_enum"))
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='politicas_retencion') # type: ignore
