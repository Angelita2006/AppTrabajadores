import datetime
import uuid
from sqlalchemy import Boolean, DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, String, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class Departamentos(Base):
    __tablename__ = 'departamentos'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='departamentos_pkey'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='departamentos_empresa_id_fkey'),
        UniqueConstraint('empresa_id', 'id', name='departamentos_empresa_id_id_key'),
        {'comment': 'Departamentos organizativos pertenecientes a una empresa.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del departamento.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa propietaria del departamento.')
    
    nombre: Mapped[str] = mapped_column(String(255), nullable=False, comment='Nombre del departamento organizativo.')
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'), comment='Indica si el departamento está activo.')
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de creación del departamento.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de la última actualización del departamento.')

    empresa: Mapped['Empresas'] = relationship('Empresas', foreign_keys=[empresa_id], back_populates='departamentos', doc='Empresa a la que pertenece el departamento.') # type: ignore
    
    contratos: Mapped[list['Contratos']] = relationship('Contratos', foreign_keys='Contratos.departamento_id', back_populates='departamento', doc='Contratos asociados al departamento.') # type: ignore
