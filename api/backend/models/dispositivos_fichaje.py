import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, DateTime, Enum, ForeignKeyConstraint, PrimaryKeyConstraint, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import MetodoFichajeEnum

class DispositivosFichaje(Base):
    __tablename__ = 'dispositivos_fichaje'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='dispositivos_fichaje_pkey', comment='Identificador único del dispositivo de fichaje.'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='dispositivos_fichaje_empresa_id_fkey', comment='Identificador de la empresa a la que pertenece el dispositivo.'),
        ForeignKeyConstraint(['empresa_id', 'centro_trabajo_id'], ['centros_trabajo.empresa_id', 'centros_trabajo.id'], ondelete='RESTRICT', name='dispositivos_fichaje_empresa_centro_fkey', comment='Identificador de la empresa y centro de trabajo al que pertenece el dispositivo.'),
        UniqueConstraint('empresa_id', 'id', name='dispositivos_fichaje_empresa_id_id_key', comment='Cada dispositivo de fichaje es único por empresa.'),
        {'comment': 'Terminales/medios de fichaje permitidos. No incluye biometría '
                'como método (prohibida en el borrador del nuevo RD salvo '
                'excepción legal).'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del dispositivo de fichaje.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador de la empresa a la que pertenece el dispositivo.')
    centro_trabajo_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='Identificador del centro de trabajo al que pertenece el dispositivo.')
    
    tipo_dispositivo: Mapped[MetodoFichajeEnum] = mapped_column(Enum(MetodoFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='metodo_fichaje_enum'), nullable=False, comment='Tipo de dispositivo de fichaje.')
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'), comment='Indica si el dispositivo de fichaje está activo.')
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de creación del dispositivo de fichaje.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de la última actualización del dispositivo de fichaje.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='dispositivos_fichaje', comment='Empresa a la que pertenece el dispositivo.') # type: ignore
    centro_trabajo: Mapped[Optional['CentrosTrabajo']] = relationship('CentrosTrabajo', back_populates='dispositivos_fichaje', comment='Centro de trabajo al que pertenece el dispositivo.') # type: ignore
    
    fichajes: Mapped[list['Fichajes']] = relationship('Fichajes', back_populates='dispositivo', comment='Fichajes asociados al dispositivo.') # type: ignore
