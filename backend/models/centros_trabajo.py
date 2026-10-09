import datetime
import decimal
from typing import Optional
import uuid
from sqlalchemy import Boolean, DateTime, ForeignKeyConstraint, Numeric, PrimaryKeyConstraint, String, Text, UniqueConstraint, Uuid, text
from core.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class CentrosTrabajo(Base):
    __tablename__ = 'centros_trabajo'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='centros_trabajo_pkey'), # Identificador único del centro de trabajo
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='centros_trabajo_empresa_id_fkey'), # El centro de trabajo debe pertenecer a la misma empresa que el calendario laboral, si aplica
        UniqueConstraint('empresa_id', 'id', name='centros_trabajo_empresa_id_id_key'), # Cada centro de trabajo es único por empresa
        {'comment': 'Centros de trabajo de la empresa. Se pueden definir varios centros de trabajo para una misma empresa, cada uno con su propio calendario laboral y ubicación.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del centro de trabajo.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece el centro de trabajo.')
    
    nombre: Mapped[str] = mapped_column(String(50), nullable=False, comment='Nombre del centro de trabajo.')
    zona_horaria: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'Europe/Madrid'::character varying"), comment='Zona horaria del centro de trabajo.')
    codigo_ccc: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, comment='Código de Cuenta de Cotización a la Seguridad Social del centro, si aplica.')
    direccion: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment='Dirección del centro de trabajo.')
    latitud: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 6), nullable=True, comment='Latitud de la ubicación del centro de trabajo.')
    longitud: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 6), nullable=True, comment='Longitud de la ubicación del centro de trabajo.')
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'), comment='Indica si el centro de trabajo está activo o inactivo.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de creación del registro.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de la última actualización del registro.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='centros_trabajo', doc='Empresa a la que pertenece el centro de trabajo.') # type: ignore
    
    calendarios_laborales: Mapped[list['CalendariosLaborales']] = relationship('CalendariosLaborales', back_populates='centro_trabajo', doc='Calendarios laborales asociados al centro de trabajo.') # type: ignore
    departamentos: Mapped[list['Departamentos']] = relationship('Departamentos', back_populates='centro_trabajo', doc='Departamentos asociados al centro de trabajo.') # type: ignore
    dispositivos_fichaje: Mapped[list['DispositivosFichaje']] = relationship('DispositivosFichaje', back_populates='centro_trabajo', doc='Dispositivos de fichaje asociados al centro de trabajo.') # type: ignore
    contratos: Mapped[list['Contratos']] = relationship('Contratos', back_populates='centro_trabajo', doc='Contratos asociados al centro de trabajo.') # type: ignore
    fichajes: Mapped[list['Fichajes']] = relationship('Fichajes', back_populates='centro_trabajo', doc='Fichajes asociados al centro de trabajo.') # type: ignore

