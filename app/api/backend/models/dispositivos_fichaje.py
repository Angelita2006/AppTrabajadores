import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKeyConstraint, PrimaryKeyConstraint, String, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from centros_trabajo import CentrosTrabajo
from empresas import Empresas
from enums import MetodoFichajeEnum
from fichajes import Fichajes

class DispositivosFichaje(Base):
    __tablename__ = 'dispositivos_fichaje'
    __table_args__ = (
        ForeignKeyConstraint(['centro_trabajo_id'], ['centros_trabajo.id'], ondelete='SET NULL', name='dispositivos_fichaje_centro_trabajo_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='dispositivos_fichaje_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='dispositivos_fichaje_pkey'),
        UniqueConstraint('empresa_id', 'identificador', name='dispositivos_fichaje_empresa_id_identificador_key'),
        {'comment': 'Terminales/medios de fichaje permitidos. No incluye biometría '
                'como método (prohibida en el borrador del nuevo RD salvo '
                'excepción legal).'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo_dispositivo: Mapped[MetodoFichajeEnum] = mapped_column(Enum(MetodoFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='metodo_fichaje_enum'), nullable=False)
    identificador: Mapped[str] = mapped_column(String(100), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    fecha_alta: Mapped[datetime.date] = mapped_column(Date, nullable=False, server_default=text('CURRENT_DATE'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    centro_trabajo_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    ubicacion: Mapped[Optional[str]] = mapped_column(String(255))

    centro_trabajo: Mapped[Optional['CentrosTrabajo']] = relationship('CentrosTrabajo', back_populates='dispositivos_fichaje')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='dispositivos_fichaje')
    fichajes: Mapped[list['Fichajes']] = relationship('Fichajes', back_populates='dispositivo')
