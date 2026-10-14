import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional
from uuid import UUID
from core.enums import CicloFacturacionEnum, EstadoSuscripcionEnum, PlanLicenciaEnum
from schemas.empresas import EmpresaSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - LICENCIAS
# ==========================================

class LicenciaBase(BaseModel):
    """
    Propiedades comunes compartidas para una licencia basado en el modelo inmutable mapeado por sqlacodegen.
    """
    codigo: str = Field(..., max_length=12, description="Código de la licencia")

    plan: PlanLicenciaEnum = Field(..., description='Nivel del plan contratado (Básico, Pro, Enterprise).')
    ciclo: CicloFacturacionEnum = Field(..., description='Ciclo de facturación (Trial, Mensual, Anual).')
    estado: EstadoSuscripcionEnum = Field(..., description='Estado actual de la suscripción.')

    fecha_inicio: datetime.date = Field(..., description="Fecha de inicio de la vigencia del servicio establecido al activar la licencia")
    fecha_expiracion: datetime.date = Field(..., description="Fecha de fin del periodo pagado")

    stripe_subscription_id: Optional[str] = Field(None, description='ID de la suscripción en la pasarela de pagos (Stripe).')
    stripe_customer_id: Optional[str] = Field(None, description='ID del cliente en la pasarela de pagos.')

    model_config = ConfigDict(from_attributes=True)

class LicenciaCreate(LicenciaBase):
    """
    Esquema unificado para crear licencias.
    Garantiza la presencia de los campos no nulos exigidos por PostgreSQL.
    """
    empresa_id: Optional[UUID] = Field(None, description="Empresa que canjeó el código; NULL mientras no se haya utilizado")

    @model_validator(mode='after')
    def validar_rango_fechas_update(self) -> 'LicenciaCreate':
        """
        Valida el rango solo si el usuario ha proporcionado ambas fechas en la petición.
        (Si solo se actualiza una, el servicio de backend deberá cruzarla con la fecha existente en BD).
        """
        if self.fecha_inicio and self.fecha_expiracion and self.fecha_expiracion < self.fecha_inicio:
            raise ValueError("La fecha de expiración de la lincencia no puede ser anterior a la fecha de inicio.")
        return self
    
    model_config = ConfigDict(from_attributes=True)

class LicenciaUpdate(BaseModel):
    """
    Esquema unificado para modificar licencias.
    Garantiza la presencia de los campos no nulos exigidos por PostgreSQL.
    """
    plan: Optional[PlanLicenciaEnum] = Field(None, description='Nivel del plan contratado (Básico, Pro, Enterprise).')
    ciclo: Optional[CicloFacturacionEnum] = Field(None, description='Ciclo de facturación (Trial, Mensual, Anual).')
    estado: Optional[EstadoSuscripcionEnum] = Field(None, description='Estado actual de la suscripción.')

    fecha_inicio: Optional[datetime.date] = Field(None, description="Fecha de inicio de la vigencia del servicio establecido al activar la licencia")
    fecha_expiracion: Optional[datetime.date] = Field(None, description="Fecha y hora de fin del periodo pagado; NULL para una licencia de pago único perpetua y para una suscripción aún no activada")

    @model_validator(mode='after')
    def validar_rango_fechas_update(self) -> 'LicenciaUpdate':
        """
        Valida el rango solo si el usuario ha proporcionado ambas fechas en la petición.
        (Si solo se actualiza una, el servicio de backend deberá cruzarla con la fecha existente en BD).
        """
        if self.fecha_inicio and self.fecha_expiracion and self.fecha_expiracion < self.fecha_inicio:
            raise ValueError("La fecha de expiración de la lincencia no puede ser anterior a la fecha de inicio.")
        return self

    model_config = ConfigDict(from_attributes=True)

class LicenciaSimpleResponse(LicenciaBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía de vuelta.
    Incluye las propiedades generadas por triggers y valores predeterminados de la base de datos.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) de la licencia")
    empresa_id: Optional[UUID] = Field(None, description="Empresa que canjeó el código, si ya se ha utilizado")

    stripe_subscription_id: Optional[str] = Field(..., description='ID de la suscripción en la pasarela de pagos (Stripe).')
    stripe_customer_id: Optional[str] = Field(..., description='ID del cliente en la pasarela de pagos.')

    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")
    revocada_at: Optional[datetime.datetime] = Field(None, description="Fecha de revocación, si se revocó")

    model_config = ConfigDict(from_attributes=True)

class LicenciaResponse(LicenciaSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")

    model_config = ConfigDict(from_attributes=True)


class LicenciaEmitirRequest(BaseModel):
    """Datos para emitir un código que todavía no está asignado a una empresa."""

    plan: PlanLicenciaEnum
    ciclo: CicloFacturacionEnum
    fecha_inicio: datetime.date = Field(default_factory=datetime.date.today)
    fecha_expiracion: datetime.date

    @model_validator(mode="after")
    def validar_fechas(self) -> "LicenciaEmitirRequest":
        if self.fecha_expiracion < self.fecha_inicio:
            raise ValueError("La fecha de expiración debe ser igual o posterior a la fecha de inicio.")
        return self
