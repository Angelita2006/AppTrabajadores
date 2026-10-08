import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from schemas.calendarios_laborales import CalendarioLaboralSimpleResponse
from core.enums import TipoFestivoEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - FESTIVOS
# ==========================================

class FestivoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un día festivo
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    id: Optional[UUID] = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del festivo")
    calendario_id: UUID = Field(..., description="ID único UUID del calendario laboral al que se asocia")

    fecha: datetime.date = Field(..., description="Fecha del día festivo en formato AAAA-MM-DD")
    tipo: TipoFestivoEnum = Field(..., max_length=30, description="Ámbito del festivo (ej: 'Nacional', 'Autonómico', 'Local')")
    activo: Optional[bool] = Field(None, description="Indica si el festivo está activo o no")
    descripcion: Optional[str] = Field(None, max_length=255, description="Descripción del festivo")

    model_config = ConfigDict(from_attributes=True)

class FestivoCreate(FestivoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al registrar un festivo en el cuadrante.
    """
    model_config = ConfigDict(from_attributes=True)

class FestivoUpdate(FestivoBase):
    """
    Esquema para la actualización de un día festivo.
    """
    model_config = ConfigDict(from_attributes=True)

class FestivoSimpleResponse(FestivoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil o web.
    """
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")

    model_config = ConfigDict(from_attributes=True)

class FestivoResponse(BaseModel):
    """
    Esquema simplificado alternativo para respuestas de festivos.
    """
    calendario: Optional[CalendarioLaboralSimpleResponse] = Field(None, description="Detalles del calendario laboral asociado")

    model_config = ConfigDict(from_attributes=True)

