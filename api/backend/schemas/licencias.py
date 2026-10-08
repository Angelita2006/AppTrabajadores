import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from core.enums import ModalidadLicenciaEnum
from schemas.empresas import EmpresaSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - LICENCIAS
# ==========================================

class LicenciaBase(BaseModel):
    """
    Propiedades comunes compartidas para una licencia basado en el modelo inmutable mapeado por sqlacodegen.
    """
    id: Optional[UUID] = Field(..., description="ID único UUID autogenerado (gen_random_uuid) de la licencia")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa asociada")

    codigo: str = Field(..., max_length=50, description="Código único para canjear la licencia comercial")
    modalidad: ModalidadLicenciaEnum = Field(..., description="Modalidad de la licencia: pago único perpetuo o suscripción mensual")
    usada: Optional[bool] = Field(None, description="Indica si la licencia está usada o no")
    motivo_revocacion: Optional[str] = Field(None, description="Motivo de la revocación de la licencia")

    fecha_inicio: datetime.date = Field(..., description="Fecha de inicio de la vigencia del servicio establecido al activar la licencia")
    fecha_expiracion: datetime.date = Field(..., description="Fecha y hora de fin del periodo pagado; NULL para una licencia de pago único perpetua y para una suscripción aún no activada")

    model_config = ConfigDict(from_attributes=True)

class LicenciaCreate(LicenciaBase):
    """
    Esquema unificado para recibir marcajes desde clientes web o móviles.
    Garantiza la presencia de los campos no nulos exigidos por PostgreSQL.
    """
    model_config = ConfigDict(from_attributes=True)

class LicenciaSimpleResponse(LicenciaBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía de vuelta.
    Incluye las propiedades generadas por triggers y valores predeterminados de la base de datos.
    """
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")
    revocada_at: datetime.datetime = Field(..., description="Marca de tiempo de la revocación efectuada (now)")

    model_config = ConfigDict(from_attributes=True)

class LicenciaResponse(LicenciaSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")

    model_config = ConfigDict(from_attributes=True)