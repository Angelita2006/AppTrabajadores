from sqlalchemy import Boolean, PrimaryKeyConstraint, SmallInteger, String, UniqueConstraint, text
from core.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from fichajes import Fichajes

class TiposEventoFichaje(Base):
    __tablename__ = 'tipos_evento_fichaje'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='tipos_evento_fichaje_pkey'),
        UniqueConstraint('codigo', name='tipos_evento_fichaje_codigo_key'),
        {'comment': 'Catálogo global: ENTRADA, SALIDA, INICIO_PAUSA, FIN_PAUSA, etc.'}
    )

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(30), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(150), nullable=False)
    computa_como_trabajo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))

    fichajes: Mapped[list['Fichajes']] = relationship('Fichajes', back_populates='tipo_evento')
