from typing import Optional
import uuid
from sqlalchemy import Boolean, ForeignKey, PrimaryKeyConstraint, SmallInteger, String, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class TiposEventoFichaje(Base):
    __tablename__ = 'tipos_evento_fichaje'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='tipos_evento_fichaje_pkey'),
        UniqueConstraint('codigo', name='tipos_evento_fichaje_codigo_key'),
        {'comment': 'Catálogo global: ENTRADA, SALIDA, INICIO_PAUSA, FIN_PAUSA, etc.'}
    )

    id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("empresas.id"), nullable=True, comment='Nulo si es un tipo de evento global del sistema.')
    codigo: Mapped[str] = mapped_column(String(30), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(150), nullable=False)
    computa_como_trabajo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='tipos_evento_fichaje') # type: ignore
    fichajes: Mapped[list['Fichajes']] = relationship('Fichajes', back_populates='tipo_evento') # type: ignore