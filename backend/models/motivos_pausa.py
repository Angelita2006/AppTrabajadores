import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, SmallInteger, String, Uuid, text
from core.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class MotivosPausa(Base):
    __tablename__ = 'motivos_pausa'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='motivos_pausa_pkey'), # Identificador único del motivo de pausa
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='motivos_pausa_empresa_id_fkey'), # NULL = motivo del catálogo global (ej. comida, descanso legal); con valor = motivo propio de una empresa
        {'comment': 'Motivos de pausa que pueden ser utilizados en los fichajes de los trabajadores. Pueden ser motivos globales (empresa_id = NULL) o motivos propios de una empresa (empresa_id = valor).'},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del motivo de pausa.')
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='NULL = motivo del catálogo global (ej. comida, descanso legal); con valor = motivo propio de una empresa.')
    
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, comment='Nombre del motivo de pausa.')
    computa_como_trabajo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'), comment='Indica si el tiempo de pausa con este motivo se computa como tiempo trabajado o no.')
    duracion_max_minutos: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True, comment='Duración máxima en minutos para este motivo de pausa.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de creación de la licencia.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de actualización de la licencia.')

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='motivos_pausa', doc='Empresa a la que pertenece el motivo de pausa.') # type: ignore
    
    fichajes: Mapped[list['Fichajes']] = relationship('Fichajes', back_populates='motivo_pausa', doc='Fichajes que utilizan este motivo de pausa.') # type: ignore
