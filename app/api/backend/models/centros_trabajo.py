
import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, SmallInteger, String, Text, UniqueConstraint, Uuid, text
from core.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from calendarios_laborales import CalendariosLaborales
from contratos import Contratos
from departamentos import Departamentos
from dispositivos_fichaje import DispositivosFichaje
from empresas import Empresas
from fichajes import Fichajes

class CentrosTrabajo(Base):
    __tablename__ = 'centros_trabajo'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='centros_trabajo_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='centros_trabajo_pkey')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    zona_horaria: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'Europe/Madrid'::character varying"))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    codigo_ccc: Mapped[Optional[str]] = mapped_column(String(20), comment='Código de Cuenta de Cotización a la Seguridad Social del centro, si aplica.')
    direccion: Mapped[Optional[str]] = mapped_column(Text)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='centros_trabajo')
    calendarios_laborales: Mapped[list['CalendariosLaborales']] = relationship('CalendariosLaborales', back_populates='centro_trabajo')
    departamentos: Mapped[list['Departamentos']] = relationship('Departamentos', back_populates='centro_trabajo')
    dispositivos_fichaje: Mapped[list['DispositivosFichaje']] = relationship('DispositivosFichaje', back_populates='centro_trabajo')
    contratos: Mapped[list['Contratos']] = relationship('Contratos', back_populates='centro_trabajo')
    fichajes: Mapped[list['Fichajes']] = relationship('Fichajes', back_populates='centro_trabajo')

