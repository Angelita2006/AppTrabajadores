import datetime
from typing import Optional
import uuid
from sqlalchemy import JSON, Boolean, Date, ForeignKeyConstraint, PrimaryKeyConstraint, String, DateTime, Text, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base

class Empresas(Base):
    __tablename__ = 'empresas'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='empresas_pkey'), # Identificador único de la empresa
        # ForeignKeyConstraint(['usuario_admin_id'], ['usuarios.id'], ondelete='RESTRICT', name='empresas_usuario_admin_id_fkey'), # Identificador del usuario administrador principal de la empresa
        # ForeignKeyConstraint(['usuario_admin_id', 'id'], ['usuarios_empresas.usuario_id', 'usuarios_empresas.empresa_id'], name='empresas_admin_membresia_fkey', deferrable=True, initially='DEFERRED', use_alter=True), # La relación usuario-empresa que representa al usuario administrador principal de la empresa
        # ForeignKeyConstraint(['usuario_admin_id', 'id'], ['usuarios_empresas.usuario_id', 'usuarios_empresas.empresa_id'], name='empresas_admin_miembro_fkey', deferrable=True, initially='DEFERRED'), # El usuario administrador principal de la empresa debe ser miembro de la empresa
        UniqueConstraint('cif', name='empresas_cif_key'), # El CIF de la empresa debe ser único
        {'comment': 'Empresas cliente de la gestoría. Raíz de aislamiento multiempresa '
                '(tenant).'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único de la empresa.')
    # usuario_admin_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Identificador del usuario administrador de la empresa.')

    nombre_comercial: Mapped[str] = mapped_column(String(50), nullable=False, comment='Nombre comercial de la empresa.')
    razon_social: Mapped[str] = mapped_column(String(50), nullable=False, comment='Razón social de la empresa.')
    cif: Mapped[str] = mapped_column(String(20), nullable=False, comment='CIF de la empresa.')
    zona_horaria: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'Europe/Madrid'::character varying"), comment='Zona horaria de la empresa.')
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'), comment='Indica si la empresa está activa.')
    configuracion: Mapped[Optional[dict]] = mapped_column(JSON, nullable=False, server_default=text("'{}'::jsonb"), comment='Configuración de la empresa.')
    es_gestoria: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'), comment='Indica si la empresa es una gestoría.')
    
    codigo_cnae: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, comment='Código CNAE de la empresa.')
    convenio_colectivo: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment='Convenio colectivo aplicable a la empresa.')
    direccion_fiscal: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment='Dirección fiscal de la empresa.')
    fecha_baja: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True, comment='Fecha de baja de la empresa.')
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment='URL del logo de la empresa.')

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de creación de la empresa.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora de la última actualización de la empresa.')

    # usuario_admin: Mapped['Usuarios'] = relationship('Usuarios', foreign_keys=[usuario_admin_id], back_populates='empresas_admin', comment='Usuario administrador principal de la empresa.') # type: ignore

    centros_trabajo: Mapped[list['CentrosTrabajo']] = relationship('CentrosTrabajo', back_populates='empresa', doc='Centros de trabajo asociados a la empresa.') # type: ignore
    motivos_pausa: Mapped[list['MotivosPausa']] = relationship('MotivosPausa', back_populates='empresa', doc='Motivos de pausa asociados a la empresa.') # type: ignore
    politicas_retencion: Mapped[Optional['PoliticasRetencion']] = relationship('PoliticasRetencion', uselist=False, back_populates='empresa', doc='Políticas de retención asociadas a la empresa.') # type: ignore
    trabajadores: Mapped[list['Trabajadores']] = relationship('Trabajadores', back_populates='empresa', doc='Trabajadores asociados a la empresa.') # type: ignore
    turnos: Mapped[list['Turnos']] = relationship('Turnos', back_populates='empresa', doc='Turnos asociados a la empresa.') # type: ignore
    calendarios_laborales: Mapped[list['CalendariosLaborales']] = relationship('CalendariosLaborales', back_populates='empresa', doc='Calendarios laborales asociados a la empresa.') # type: ignore
    departamentos: Mapped[list['Departamentos']] = relationship('Departamentos', back_populates='empresa', doc='Departamentos asociados a la empresa.') # type: ignore
    roles: Mapped[list['Roles']] = relationship('Roles', back_populates='empresa', doc='Roles asociados a la empresa') # type: ignore
    dispositivos_fichaje: Mapped[list['DispositivosFichaje']] = relationship('DispositivosFichaje', back_populates='empresa', doc='Dispositivos de fichaje asociados a la empresa.') # type: ignore
    resumenes_jornada: Mapped[list['ResumenesJornada']] = relationship('ResumenesJornada', back_populates='empresa', doc='Resúmenes de jornada asociados a la empresa.') # type: ignore
    usuarios_empresas: Mapped[list['UsuariosEmpresas']] = relationship('UsuariosEmpresas', back_populates='empresa', doc='Relaciones con usuarios.') # type: ignore
    gestorias_como_gestora: Mapped[list['GestoriasEmpresas']] = relationship('GestoriasEmpresas', foreign_keys='GestoriasEmpresas.gestoria_empresa_id', back_populates='gestoria', doc='Relaciones con otras empresas como gestora.') # type: ignore
    gestorias_como_cliente: Mapped[list['GestoriasEmpresas']] = relationship('GestoriasEmpresas', foreign_keys='GestoriasEmpresas.empresa_cliente_id', back_populates='empresa_cliente', doc='Relaciones con otras empresas como cliente.') # type: ignore
    auditoria_accesos: Mapped[list['AuditoriaAccesos']] = relationship('AuditoriaAccesos', back_populates='empresa', doc='Auditoría de accesos asociada a la empresa.') # type: ignore
    contratos: Mapped[list['Contratos']] = relationship('Contratos', back_populates='empresa', doc='Contratos asociados a la empresa.') # type: ignore
    fichajes: Mapped[list['Fichajes']] = relationship('Fichajes', back_populates='empresa', doc='Fichajes asociados a la empresa.') # type: ignore
    correcciones_fichaje: Mapped[list['CorreccionesFichaje']] = relationship('CorreccionesFichaje', back_populates='empresa', doc='Correcciones de fichaje asociadas a la empresa.') # type: ignore
    ausencias: Mapped[list['Ausencias']] = relationship('Ausencias', back_populates='empresa', doc='Ausencias asociadas a la empresa.') # type: ignore
    licencia: Mapped[Optional['Licencias']] = relationship('Licencias', uselist=False, back_populates='empresa', doc='Licencia asociada a la empresa.') # type: ignore
