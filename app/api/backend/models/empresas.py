import datetime
from typing import Optional
import uuid
from sqlalchemy import JSON, Boolean, Date, PrimaryKeyConstraint, String, DateTime, Text, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class Empresas(Base):
    __tablename__ = 'empresas'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='empresas_pkey'),
        UniqueConstraint('cif', name='empresas_cif_key'),
        {'comment': 'Empresas cliente de la gestoría. Raíz de aislamiento multiempresa '
                '(tenant).'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    razon_social: Mapped[str] = mapped_column(String(255), nullable=False)
    cif: Mapped[str] = mapped_column(String(20), nullable=False)
    zona_horaria: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'Europe/Madrid'::character varying"))
    configuracion: Mapped[dict] = mapped_column(JSON, nullable=False, server_default=text("'{}'::jsonb"))
    fecha_alta: Mapped[datetime.date] = mapped_column(Date, nullable=False, server_default=text('CURRENT_DATE'))
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    nombre_comercial: Mapped[Optional[str]] = mapped_column(String(255))
    codigo_cnae: Mapped[Optional[str]] = mapped_column(String(10))
    convenio_colectivo: Mapped[Optional[str]] = mapped_column(String(255))
    direccion_fiscal: Mapped[Optional[str]] = mapped_column(Text)
    fecha_baja: Mapped[Optional[datetime.date]] = mapped_column(Date)

    centros_trabajo: Mapped[list['CentrosTrabajo']] = relationship('CentrosTrabajo', back_populates='empresa') # type: ignore
    motivos_pausa: Mapped[list['MotivosPausa']] = relationship('MotivosPausa', back_populates='empresa') # type: ignore
    politicas_retencion: Mapped[Optional['PoliticasRetencion']] = relationship('PoliticasRetencion', uselist=False, back_populates='empresa') # type: ignore
    trabajadores: Mapped[list['Trabajadores']] = relationship('Trabajadores', back_populates='empresa') # type: ignore
    turnos: Mapped[list['Turnos']] = relationship('Turnos', back_populates='empresa') # type: ignore
    calendarios_laborales: Mapped[list['CalendariosLaborales']] = relationship('CalendariosLaborales', back_populates='empresa') # type: ignore
    departamentos: Mapped[list['Departamentos']] = relationship('Departamentos', back_populates='empresa') # type: ignore
    dispositivos_fichaje: Mapped[list['DispositivosFichaje']] = relationship('DispositivosFichaje', back_populates='empresa') # type: ignore
    resumenes_jornada: Mapped[list['ResumenesJornada']] = relationship('ResumenesJornada', back_populates='empresa') # type: ignore
    usuarios: Mapped[list['Usuarios']] = relationship('Usuarios', back_populates='empresa') # type: ignore
    auditoria_accesos: Mapped[list['AuditoriaAccesos']] = relationship('AuditoriaAccesos', back_populates='empresa') # type: ignore
    contratos: Mapped[list['Contratos']] = relationship('Contratos', back_populates='empresa') # type: ignore
    fichajes: Mapped[list['Fichajes']] = relationship('Fichajes', back_populates='empresa') # type: ignore
    usuarios_roles: Mapped[list['UsuariosRoles']] = relationship('UsuariosRoles', back_populates='empresa') # type: ignore
    correcciones_fichaje: Mapped[list['CorreccionesFichaje']] = relationship('CorreccionesFichaje', back_populates='empresa') # type: ignore
    ausencias: Mapped[list['Ausencias']] = relationship('Ausencias', back_populates='empresa') # type: ignore