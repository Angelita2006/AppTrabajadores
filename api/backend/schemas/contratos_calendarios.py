import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from schemas.calendarios_laborales import CalendarioLaboralSimpleResponse
from schemas.contratos import ContratoSimpleResponse
from schemas.centros_trabajo import CentroTrabajoSimpleResponse
from schemas.empresas import EmpresaSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - RELACIÓN ENTRE CONTRATOS Y CALENDARIOS LABORALES
# ==========================================

class ContratoCalendarioBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un centro de trabajo
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    id: Optional[UUID] = Field(..., description="ID único UUID autogenerado (gen_random_uuid) de la relación contrato-calendario")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    centro_trabajo_id: UUID = Field(..., description="ID único UUID del centro de trabajo")
    contrato_id: UUID = Field(..., description="ID único UUID del contrato")
    calendario_laboral_id: UUID = Field(..., description="ID único UUID del calendario laboral")

    model_config = ConfigDict(from_attributes=True)

class ContratoCalendarioCreate(ContratoCalendarioBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al dar de alta un centro de trabajo.
    Contiene campos de localización y registro de cotización opcionales.
    """
    model_config = ConfigDict(from_attributes=True)
    
class ContratoCalendarioUpdate(ContratoCalendarioBase):                                                                                                                                                                                                          
    """
    Esquema para la actualización parcial de un centro de trabajo.
    Todos los campos son opcionales para permitir actualizaciones 'patch'.
    """
    model_config = ConfigDict(from_attributes=True)

class ContratoCalendarioSimpleResponse(ContratoCalendarioBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil o web.
    Muestra la vigencia operativa y los metadatos de auditoría temporal del sistema.
    """
    created_at: datetime.datetime = Field(..., description="Fecha y hora de inserción real calculada por el servidor (now)")
    updated_at: datetime.datetime = Field(..., description="Fecha y hora de la última modificación efectuada (now)")

    model_config = ConfigDict(from_attributes=True)

class ContratoCalendarioResponse(ContratoCalendarioSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    centro_trabajo: Optional[CentroTrabajoSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    contrato: Optional[ContratoSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    calendario_laboral: Optional[CalendarioLaboralSimpleResponse] = Field(None, description="Detalles de la empresa asociada")

    model_config = ConfigDict(from_attributes=True)