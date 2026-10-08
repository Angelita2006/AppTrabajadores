import datetime
from typing import Optional
import uuid
from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKeyConstraint, PrimaryKeyConstraint, String, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from core.enums import CicloFacturacionEnum, EstadoSuscripcionEnum, PlanLicenciaEnum

class Licencias(Base):
    __tablename__ = 'licencias'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='licencias_pkey'), # Identificador único de la licencia
        ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='CASCADE', name='licencias_empresa_id_fkey'), # Empresa que canjeó la licencia; NULL mientras el código no se haya utilizado
        UniqueConstraint('empresa_id', name='licencias_empresa_id_key'), # Cada empresa puede tener asignada una sola licencia comercial
        CheckConstraint('fecha_expiracion IS NULL OR fecha_inicio IS NULL OR fecha_expiracion >= fecha_inicio', name='licencias_rango_vigencia_check'), # La fecha de expiración debe ser mayor o igual que la fecha de inicio de la vigencia
        {'comment': 'Suscripciones y licencias SaaS de las empresas (Trial de 14 días, Básico, Pro, Enterprise con facturación mensual o anual).'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, nullable=False, server_default=text('gen_random_uuid()'), comment='Identificador único de la licencia.')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Empresa que canjeó la licencia; NULL mientras el código no se haya utilizado.')

    plan: Mapped[PlanLicenciaEnum] = mapped_column(Enum(PlanLicenciaEnum, values_callable=lambda cls: [m.value for m in cls], name='plan_licencia_enum'), nullable=False, server_default='Básico', comment='Nivel del plan contratado (Básico, Pro, Enterprise).')
    ciclo: Mapped[CicloFacturacionEnum] = mapped_column(Enum(CicloFacturacionEnum, values_callable=lambda cls: [m.value for m in cls], name='ciclo_facturacion_enum'), nullable=False, server_default='Trial', comment='Ciclo de facturación (Trial, Mensual, Anual).')
    estado: Mapped[EstadoSuscripcionEnum] = mapped_column(Enum(EstadoSuscripcionEnum, values_callable=lambda cls: [m.value for m in cls], name='estado_suscripcion_enum'), nullable=False, server_default='Trialing', comment='Estado actual de la suscripción.')

    fecha_inicio: Mapped[datetime.date] = mapped_column(Date, nullable=False, server_default=text('current_date'), comment='Inicio del periodo actual de vigencia.')
    fecha_expiracion: Mapped[datetime.date] = mapped_column(Date, nullable=False, comment='Fecha exacta en que expira el periodo de prueba (Trial) o la suscripción pagada.')

    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True, comment='ID de la suscripción en la pasarela de pagos (Stripe).')
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment='ID del cliente en la pasarela de pagos.')
   
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de creación de la licencia.')
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'), comment='Fecha de actualización de la licencia.')
    revocada_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), nullable=True, comment='Fecha en que se revocó la licencia, si corresponde.')

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='licencia', doc='Empresa que tiene asignada la licencia comercial.') # type: ignore