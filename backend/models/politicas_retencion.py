import datetime
import uuid
from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKeyConstraint, Index, PrimaryKeyConstraint, SmallInteger, Uuid, text
from core.database import Base
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import AccionRetencionEnum

class PoliticasRetencion(Base):
    __tablename__ = 'politicas_retencion'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='politicas_retencion_pkey'), # Identificador único de la política de retención
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='politicas_retencion_empresa_id_fkey'), # Referencia a la empresa propietaria de la política de retención
        CheckConstraint('anios_conservacion >= 4', name='politicas_retencion_anios_conservacion_check'), # El número de años de conservación debe ser mayor o igual a 4.'),
        Index('politicas_retencion_unica_global_key', text('(1)'), unique=True, postgresql_where=text('empresa_id IS NULL')), # Política global de retención (empresa_id NULL) y overrides empresariales que nunca deben reducir el mínimo global
        Index('politicas_retencion_unica_por_empresa_key', 'empresa_id', unique=True, postgresql_where=text('empresa_id IS NOT NULL')), # Política de retención específica por empresa (empresa_id NOT NULL)
        {'comment': 'Política global de retención (empresa_id NULL) y overrides empresariales que nunca deben reducir el mínimo global.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único de la política de retención.')
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='NULL = política global por defecto; con valor = política propia de una empresa.')

    anios_conservacion: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('4'), comment='Número de años que se conservarán los datos antes de aplicar la acción de retención.')
    accion_tras_periodo: Mapped[AccionRetencionEnum] = mapped_column(Enum(AccionRetencionEnum, values_callable=lambda cls: [member.value for member in cls], name='accion_retencion_enum'), nullable=False, server_default=text("'Archivar'::accion_retencion_enum"), comment='Acción a realizar sobre los datos una vez transcurrido el periodo de conservación.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de creación de la licencia.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de actualización de la licencia.')

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='politicas_retencion', doc='Empresa propietaria de la política de retención.') # type: ignore
