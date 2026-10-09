import datetime
from typing import Any, Optional
import uuid
from sqlalchemy import DateTime, Enum, ForeignKeyConstraint, Index, String, PrimaryKeyConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from sqlalchemy.dialects.postgresql import JSONB
from core.enums import AccionAuditoriaEnum

class AuditoriaAccesos(Base):
    __tablename__ = 'auditoria_accesos'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='auditoria_accesos_pkey'), # Identificador único del registro de auditoría
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='auditoria_accesos_empresa_id_fkey'), # El registro de auditoría debe pertenecer a la misma empresa que el usuario y el trabajador, si aplica
        ForeignKeyConstraint(['trabajador_id'], ['trabajadores.id'], ondelete='SET NULL', name='auditoria_accesos_trabajador_id_fkey'), # El registro de auditoría debe estar relacionado con un trabajador, si aplica
        ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='SET NULL', name='auditoria_accesos_usuario_id_fkey'), # El registro de auditoría debe estar relacionado con un usuario, si aplica
        Index('idx_auditoria_empresa_fecha', 'empresa_id', 'fecha_hora'), # Índice para consultas de auditoría por empresa y fecha
        Index('idx_auditoria_usuario', 'usuario_id', postgresql_where='(usuario_id IS NOT NULL)'), # Índice para consultas de auditoría por usuario, si aplica
        Index('idx_auditoria_trabajador', 'trabajador_id', postgresql_where='(trabajador_id IS NOT NULL)'), # Índice para consultas de auditoría por trabajador, si aplica
        {'comment': 'Registra cada consulta, exportación o descarga de fichajes: '
                'quién, de qué trabajador y cuándo. Sirve de prueba de que el '
                'sistema permite el acceso exigido por ley a trabajador, '
                'representantes legales e ITSS, y de detección de accesos '
                'indebidos.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único del registro de auditoría.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=True, comment='Identificador de la empresa a la que pertenece el registro.')
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='Identificador del usuario que realiza la acción.')
    trabajador_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='Identificador del trabajador relacionado con la acción.')
    
    accion: Mapped[AccionAuditoriaEnum] = mapped_column(Enum(AccionAuditoriaEnum, values_callable=lambda cls: [member.value for member in cls], name='accion_auditoria_enum'), nullable=False, server_default=text("'Consulta'::accion_auditoria_enum"), comment='Tipo de acción realizada.')
    fecha_hora: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha y hora en que se realiza la acción.')
    detalle: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, comment='Detalles adicionales sobre la acción realizada.')
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment='Dirección IP desde donde se realiza la acción.')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='auditoria_accesos', doc='Empresa a la que pertenece el registro.') # type: ignore
    usuario: Mapped[Optional['Usuarios']] = relationship('Usuarios', back_populates='auditoria_accesos', doc='Usuario que realiza la acción.') # type: ignore
    trabajador: Mapped[Optional['Trabajadores']] = relationship('Trabajadores', back_populates='auditoria_accesos', doc='Trabajador relacionado con la acción.') # type: ignore
