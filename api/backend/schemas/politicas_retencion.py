from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from core.enums import AccionRetencionEnum
from schemas.empresas import EmpresaSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - POLÍTICAS DE RETENCIÓN
# ==========================================

class PoliticaRetencionBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una política de conservación legal,
    basada en el modelo relacional mapeado por sqlacodegen.
    """
    id: Optional[UUID] = Field(..., description="ID único UUID autogenerado (gen_random_uuid) de la política de retención")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa asociada")

    anios_conservacion: int = Field(4, ge=4, description="Años obligatorios de conservación de los fichajes (SmallInteger)")
    accion_tras_periodo: AccionRetencionEnum = Field(..., description="Acción de purga legal (archivar, anonimizar, eliminar)")

    model_config = ConfigDict(from_attributes=True)

class PoliticaRetencionCreate(PoliticaRetencionBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al configurar una política.
    Permite dejar el campo 'empresa_id' vacío para establecer la norma general del sistema.
    """
    model_config = ConfigDict(from_attributes=True)

class PoliticaRetencionUpdate(PoliticaRetencionBase):
    """
    Esquema para la actualización parcial o total de una política de retención.
    """
    model_config = ConfigDict(from_attributes=True)

class PoliticaRetencionSimpleResponse(PoliticaRetencionBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones.
    """
    model_config = ConfigDict(from_attributes=True)

class PoliticaRetencionResponse(PoliticaRetencionSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")

    model_config = ConfigDict(from_attributes=True)