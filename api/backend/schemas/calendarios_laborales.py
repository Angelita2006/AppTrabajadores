import datetime
from pydantic import UUID4, BaseModel, Field, ConfigDict
from typing import List, Optional
from uuid import UUID
from schemas.festivos import FestivoResponse2

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - CALENDARIOS LABORALES
# ==========================================

class CalendarioLaboralBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un calendario laboral
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    anio: int = Field(..., ge=2000, le=2100, description="Año numérico correspondiente al calendario (SmallInteger)")
    nombre: str = Field(..., min_length=2, max_length=150, description="Nombre descriptivo del calendario (Ej: 'Calendario de Oficinas 2026')")

class CalendarioLaboralCreate(CalendarioLaboralBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al dar de alta un calendario.
    Permite acotar el calendario a un centro de trabajo específico si fuera necesario.
    """
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID único UUID del centro de trabajo si es un calendario específico")

class CalendarioLaboralUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de un calendario laboral.
    """
    anio: Optional[int] = Field(None, ge=2000, le=2100, description="Año numérico")
    nombre: Optional[str] = Field(None, min_length=2, max_length=150, description="Nombre descriptivo del calendario")
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID único UUID del centro de trabajo")

class CalendarioLaboralResponse(CalendarioLaboralBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil o web.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID único UUID del centro de trabajo asociado")

    model_config = ConfigDict(from_attributes=True)

class CalendarioConFestivosResponse(BaseModel):
    """
    Esquema compuesto que devuelve los datos del calendario junto con su lista de días festivos.
    """
    id: UUID4 = Field(..., description="Identificador único UUID del calendario")
    nombre: Optional[str] = Field(None, description="Nombre del calendario")
    anio: int = Field(..., description="Año del calendario")
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID del centro de trabajo asociado si aplica")
    festivos: List[FestivoResponse2] = Field(..., description="Lista de festivos vinculados al calendario")

    model_config = ConfigDict(from_attributes=True)