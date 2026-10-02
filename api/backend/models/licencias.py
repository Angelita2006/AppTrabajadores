import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Enum, ForeignKeyConstraint, PrimaryKeyConstraint, String, Text, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import ModalidadLicenciaEnum

class Licencias(Base):
    __tablename__ = 'licencias'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='licencias_pkey', comment='Identificador único de la licencia.'),
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='RESTRICT', name='licencias_empresa_id_fkey', comment='Empresa que canjeó la licencia; NULL mientras el código no se haya utilizado.'),
        UniqueConstraint('codigo', name='licencias_codigo_key', comment='Código único para canjear la licencia comercial.'),
        UniqueConstraint('empresa_id', name='licencias_empresa_id_key', comment='Cada empresa puede tener asignada una sola licencia comercial.'),
        CheckConstraint(
            "(modalidad = 'Pago_unico' AND fecha_expiracion IS NULL) OR "
            "(modalidad = 'Suscripcion_mensual' AND "
            "((NOT usada AND fecha_expiracion IS NULL) OR "
            "(usada AND fecha_expiracion IS NOT NULL)))",
            name='licencias_modalidad_vigencia_check',
            comment='Las licencias de pago único no tienen fecha de expiración; las licencias de suscripción mensual deben tener fecha de expiración si ya fueron canjeadas.'
        ),
        CheckConstraint(
            'fecha_expiracion IS NULL OR fecha_inicio IS NULL OR fecha_expiracion >= fecha_inicio',
            name='licencias_rango_vigencia_check',
            comment='La fecha de expiración debe ser mayor o igual que la fecha de inicio de la vigencia.'
        ),
        CheckConstraint(
            '(usada = (empresa_id IS NOT NULL)) AND (NOT usada OR fecha_inicio IS NOT NULL)',
            name='licencias_canjes_empresa_fecha_check',
            comment='Una licencia solo puede estar marcada como usada si ya fue canjeada por una empresa; la fecha de inicio debe estar presente si la licencia fue usada.'
        ),
        CheckConstraint('revocada_at IS NULL OR usada IS TRUE', name='licencias_revocacion_solo_canjes_check', comment='Una licencia solo puede ser revocada si ya fue canjeada por una empresa.'),
        {'comment': 'Licencias comerciales de las empresas. El código se canjea una sola vez; la vigencia puede ser perpetua por pago único o temporal por suscripción mensual.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único de la licencia.')
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, comment='Empresa que canjeó la licencia; NULL mientras el código no se haya utilizado.')
    
    codigo: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))"), comment='Código único para canjear la licencia comercial.')
    modalidad: Mapped[ModalidadLicenciaEnum] = mapped_column(Enum(ModalidadLicenciaEnum, values_callable=lambda cls: [member.value for member in cls], name='modalidad_licencia_enum'), nullable=False, comment='Pago único perpetuo o suscripción mensual.')
    usada: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'), comment='Indica si la licencia ya ha sido utilizada para registrar una empresa.')
    fecha_inicio: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True, comment='Inicio de la vigencia del servicio, establecido al activar/canjear la licencia.')
    fecha_expiracion: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True, comment='Fin del periodo pagado; NULL para una licencia de pago único perpetua y para una suscripción aún no activada.')
    motivo_revocacion: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment='Motivo de revocación de la licencia.')
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de creación de la licencia.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de actualización de la licencia.')
    revocada_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), nullable=True, comment='Fecha en que se revocó la licencia, si corresponde.')

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='licencia', comment='Empresa que tiene asignada la licencia comercial.') # type: ignore