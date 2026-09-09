from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from core.enums import AccionRetencionEnum
from schemas.empresas import EmpresaResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - POLÍTICAS DE RETENCIÓN
# ==========================================

class PoliticaRetencionBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una política de conservación legal,
    basada en el modelo relacional mapeado por sqlacodegen.
    """
    anios_conservacion: int = Field(4, ge=4, description="Años obligatorios de conservación de los fichajes (SmallInteger)")
    accion_tras_periodo: AccionRetencionEnum = Field(AccionRetencionEnum.ARCHIVAR, description="Acción de purga legal (archivar, anonimizar, eliminar)")

    model_config = ConfigDict(from_attributes=True)

class PoliticaRetencionCreate(PoliticaRetencionBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al configurar una política.
    Permite dejar el campo 'empresa_id' vacío para establecer la norma general del sistema.
    """
    empresa_id: Optional[UUID] = Field(None, description="ID único UUID de la empresa cliente, o NULL si es la directiva global")

class PoliticaRetencionUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de una política de retención.
    """
    anios_conservacion: Optional[int] = Field(None, ge=4, description="Años obligatorios de conservación de los fichajes")
    accion_tras_periodo: Optional[AccionRetencionEnum] = Field(None, description="Acción de purga legal")
    empresa_id: Optional[UUID] = Field(None, description="ID único UUID de la empresa cliente si aplica")

    model_config = ConfigDict(from_attributes=True)

class PoliticaRetencionSimpleResponse(PoliticaRetencionBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    empresa_id: Optional[UUID] = Field(None, description="ID único UUID de la empresa cliente si aplica")

    model_config = ConfigDict(from_attributes=True)

class PoliticaRetencionResponse(PoliticaRetencionSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaResponse] = Field(None, description="Detalles de la empresa asociada")

    model_config = ConfigDict(from_attributes=True)