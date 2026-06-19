import datetime
from typing import Optional
import uuid
from sqlalchemy import DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from centros_trabajo import CentrosTrabajo
from contratos import Contratos
from core.database import Base
from empresas import Empresas

class Departamentos(Base):
    __tablename__ = 'departamentos'
    __table_args__ = (
        ForeignKeyConstraint(['centro_trabajo_id'], ['centros_trabajo.id'], ondelete='SET NULL', name='departamentos_centro_trabajo_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='departamentos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='departamentos_pkey')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    centro_trabajo_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    centro_trabajo: Mapped[Optional['CentrosTrabajo']] = relationship('CentrosTrabajo', back_populates='departamentos')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='departamentos')
    contratos: Mapped[list['Contratos']] = relationship('Contratos', back_populates='departamento')
