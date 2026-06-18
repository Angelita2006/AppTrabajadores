from typing import Optional
import uuid
from sqlalchemy import Boolean, ForeignKeyConstraint, PrimaryKeyConstraint, SmallInteger, String, Uuid, text
from core.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from empresas import Empresas
from fichajes import Fichajes

class MotivosPausa(Base):
    __tablename__ = 'motivos_pausa'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='motivos_pausa_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='motivos_pausa_pkey')
    )

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    computa_como_trabajo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, comment='NULL = motivo del catálogo global (ej. comida, descanso legal); con valor = motivo propio de una empresa.')
    duracion_max_minutos: Mapped[Optional[int]] = mapped_column(SmallInteger)

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='motivos_pausa')
    fichajes: Mapped[list['Fichajes']] = relationship('Fichajes', back_populates='motivo_pausa')
