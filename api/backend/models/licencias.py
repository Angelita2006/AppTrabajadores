import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, Date, ForeignKeyConstraint, PrimaryKeyConstraint, String, DateTime, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class Licencias(Base):
    __tablename__ = 'licencias'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='SET NULL', name='licencias_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='licencias_pkey'),
        UniqueConstraint('codigo', name='licencias_codigo_key'),
        UniqueConstraint('empresa_id', name='licencias_empresa_id_key'),
        {'comment': 'Códigos de licencia de activación para el registro de nuevas empresas.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    codigo: Mapped[str] = mapped_column(
        String(50), 
        nullable=False, 
        server_default=text("upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))")
    )
    usada: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    fecha_expiracion: Mapped[Optional[datetime.date]] = mapped_column(Date)
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='licencia') # type: ignore