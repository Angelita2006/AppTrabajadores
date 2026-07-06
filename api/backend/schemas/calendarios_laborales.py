import datetime
from pydantic import UUID4, BaseModel, Field
from typing import List, Optional
from uuid import UUID
from schemas.festivos import FestivoResponse2

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================
class CalendarioConFestivosResponse(BaseModel):
    id: UUID4
    anio: int
    festivos: List[FestivoResponse2]

    class Config:
        from_attributes = True

class CalendarioLaboralBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un calendario laboral
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    anio: int = Field(..., ge=2000, le=2100, description="Año numérico correspondiente al calendario (SmallInteger)")
    nombre: str = Field(..., max_length=150, description="Nombre descriptivo del calendario (Ej: 'Calendario de Oficinas 2026')")


class CalendarioLaboralCreate(CalendarioLaboralBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al dar de alta un calendario.
    Permite acotar el calendario a un centro de trabajo específico si fuera necesario.
    """
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID único UUID del centro de trabajo si es un calendario específico")


class CalendarioLaboralResponse(CalendarioLaboralBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil o web.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    
    # Propiedades complementarias opcionales expuestas en el JSON
    centro_trabajo_id: Optional[UUID] = Field(None)

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
