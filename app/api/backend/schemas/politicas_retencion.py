from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

from enums import AccionRetencionEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class PoliticaRetencionBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una política de conservación legal,
    basada en el modelo relacional mapeado por sqlacodegen.
    """
    # Emula el CheckConstraint físico forzando un mínimo de 4 años según el art. 34.9 del ET
    anios_conservacion: int = Field(4, ge=4, description="Años obligatorios de conservación de los fichajes (SmallInteger)")
    accion_tras_periodo: AccionRetencionEnum = Field(AccionRetencionEnum.ARCHIVAR, description="Acción de purga legal (archivar, anonimizar, eliminar)")


class PoliticaRetencionCreate(PoliticaRetencionBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al configurar una política.
    Permite dejar el campo 'empresa_id' vacío para establecer la norma general del sistema.
    """
    # NULL mapea directamente con la política global por defecto del servidor
    empresa_id: Optional[UUID] = Field(None, description="ID único UUID de la empresa cliente, o NULL si es la directiva global")


class PoliticaRetencionResponse(PoliticaRetencionBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    
    # Propiedades complementarias opcionales expuestas en el JSON
    empresa_id: Optional[UUID] = Field(None)

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
