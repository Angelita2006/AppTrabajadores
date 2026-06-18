import datetime
from typing import Any, Optional
import uuid
from sqlalchemy import DateTime, Enum, ForeignKeyConstraint, Index, PrimaryKeyConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from sqlalchemy.dialects.postgresql import INET, JSONB
from empresas import Empresas
from enums import AccionAuditoriaEnum
from trabajadores import Trabajadores
from usuarios import Usuarios

class AuditoriaAccesos(Base):
    __tablename__ = 'auditoria_accesos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='auditoria_accesos_empresa_id_fkey'),
        ForeignKeyConstraint(['trabajador_id'], ['trabajadores.id'], ondelete='SET NULL', name='auditoria_accesos_trabajador_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='SET NULL', name='auditoria_accesos_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='auditoria_accesos_pkey'),
        Index('idx_auditoria_empresa_fecha', 'empresa_id', 'fecha_hora'),
        Index('idx_auditoria_trabajador', 'trabajador_id', postgresql_where='(trabajador_id IS NOT NULL)'),
        {'comment': 'Registra cada consulta, exportación o descarga de fichajes: '
                'quién, de qué trabajador y cuándo. Sirve de prueba de que el '
                'sistema permite el acceso exigido por ley a trabajador, '
                'representantes legales e ITSS, y de detección de accesos '
                'indebidos.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    accion: Mapped[AccionAuditoriaEnum] = mapped_column(Enum(AccionAuditoriaEnum, values_callable=lambda cls: [member.value for member in cls], name='accion_auditoria_enum'), nullable=False)
    fecha_hora: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    trabajador_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    detalle: Mapped[Optional[dict]] = mapped_column(JSONB)
    ip_address: Mapped[Optional[Any]] = mapped_column(INET)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='auditoria_accesos')
    trabajador: Mapped[Optional['Trabajadores']] = relationship('Trabajadores', back_populates='auditoria_accesos')
    usuario: Mapped[Optional['Usuarios']] = relationship('Usuarios', back_populates='auditoria_accesos')
