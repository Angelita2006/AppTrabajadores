import datetime
from typing import Optional
import uuid
from sqlalchemy import DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, SmallInteger, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from centros_trabajo import CentrosTrabajo
from core.database import Base
from empresas import Empresas
from festivos import Festivos

class CalendariosLaborales(Base):
    __tablename__ = 'calendarios_laborales'
    __table_args__ = (
        ForeignKeyConstraint(['centro_trabajo_id'], ['centros_trabajo.id'], ondelete='SET NULL', name='calendarios_laborales_centro_trabajo_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='calendarios_laborales_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='calendarios_laborales_pkey')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    anio: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    centro_trabajo_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    centro_trabajo: Mapped[Optional['CentrosTrabajo']] = relationship('CentrosTrabajo', back_populates='calendarios_laborales')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='calendarios_laborales')
    festivos: Mapped[list['Festivos']] = relationship('Festivos', back_populates='calendario')
