import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, String, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class Departamentos(Base):
    __tablename__ = 'departamentos'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='departamentos_pkey'), # Identificador único del departamento
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='departamentos_empresa_id_fkey'), # Identificador de la empresa a la que pertenece el departamento
        ForeignKeyConstraint(['empresa_id', 'centro_trabajo_id'], ['centros_trabajo.empresa_id', 'centros_trabajo.id'], ondelete='RESTRICT', name='departamentos_empresa_centro_fkey'), # El departamento debe pertenecer a la misma empresa que el centro de trabajo, si aplica
        UniqueConstraint('empresa_id', 'id', name='departamentos_empresa_id_id_key'), # Cada departamento es único por empresa
        {'comment': 'Departamentos de la empresa o centro de trabajo. Se pueden usar para clasificar a los trabajadores y asignarles turnos, calendarios laborales, etc.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del departamento.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece el departamento.')
    centro_trabajo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del centro de trabajo al que pertenece el departamento.')
    
    nombre: Mapped[str] = mapped_column(String(255), nullable=False, comment='Nombre del departamento.')
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'), comment='Indica si el departamento está activo.')
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de creación del departamento.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de la última actualización del departamento.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='departamentos', doc='Empresa a la que pertenece el departamento.') # type: ignore
    centro_trabajo: Mapped[Optional['CentrosTrabajo']] = relationship('CentrosTrabajo', back_populates='departamentos', doc='Centro de trabajo al que pertenece el departamento.') # type: ignore
    
    contratos: Mapped[list['Contratos']] = relationship('Contratos', back_populates='departamento', doc='Contratos asociados al departamento.') # type: ignore
