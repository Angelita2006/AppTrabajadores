import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, Date, ForeignKeyConstraint, PrimaryKeyConstraint, String, DateTime, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from asignaciones_turno import AsignacionesTurno
from empresas import Empresas
from auditoria_accesos import AuditoriaAccesos
from contratos import Contratos
from correcciones_fichaje import CorreccionesFichaje
from fichajes import Fichajes
from usuarios import Usuarios
from resumenes_jornada import ResumenesJornada

class Trabajadores(Base):
    __tablename__ = 'trabajadores'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='trabajadores_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='trabajadores_pkey'),
        UniqueConstraint('empresa_id', 'nif_nie', name='trabajadores_empresa_id_nif_nie_key'),
        {'comment': 'Trabajadores de cada empresa cliente. El derecho de supresión '
                '(art. 17 RGPD) no aplica mientras existan fichajes en periodo de '
                'conservación legal (excepción art. 17.3.b RGPD); en su lugar se '
                'usa activo/fecha_baja_empresa.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nif_nie: Mapped[str] = mapped_column(String(15), nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(150), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    fecha_alta_empresa: Mapped[datetime.date] = mapped_column(Date, nullable=False, server_default=text('CURRENT_DATE'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    telefono: Mapped[Optional[str]] = mapped_column(String(30))
    numero_seguridad_social: Mapped[Optional[str]] = mapped_column(String(20))
    fecha_nacimiento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    fecha_baja_empresa: Mapped[Optional[datetime.date]] = mapped_column(Date)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='trabajadores')
    asignaciones_turno: Mapped[list['AsignacionesTurno']] = relationship('AsignacionesTurno', back_populates='trabajador')
    resumenes_jornada: Mapped[list['ResumenesJornada']] = relationship('ResumenesJornada', back_populates='trabajador')
    usuarios: Mapped[Optional['Usuarios']] = relationship('Usuarios', uselist=False, back_populates='trabajador')
    auditoria_accesos: Mapped[list['AuditoriaAccesos']] = relationship('AuditoriaAccesos', back_populates='trabajador')
    contratos: Mapped[list['Contratos']] = relationship('Contratos', back_populates='trabajador')
    fichajes: Mapped[list['Fichajes']] = relationship('Fichajes', back_populates='trabajador')
    correcciones_fichaje: Mapped[list['CorreccionesFichaje']] = relationship('CorreccionesFichaje', back_populates='trabajador')
