from datetime import date
from pydantic import UUID4, BaseModel, Field
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class FestivoResponse2(BaseModel):
    id: UUID4
    fecha: date          
    descripcion: str
    tipo: str

    class Config:
        from_attributes = True  


class FestivoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un día festivo
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    calendario_id: UUID = Field(..., description="ID único UUID del calendario laboral al que se asocia")
    fecha: date = Field(..., description="Fecha del día festivo en formato AAAA-MM-DD")
    tipo: str = Field("nacional", max_length=30, description="Ámbito del festivo (ej: 'nacional', 'autonomico', 'local')")


class FestivoCreate(FestivoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al registrar un festivo en el cuadrante.
    """
    descripcion: Optional[str] = Field(None, max_length=255, description="Nombre o motivo del festivo (Ej: 'Año Nuevo')")


class FestivoResponse(FestivoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil o web.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    
    descripcion: Optional[str] = Field(None)

    class Config:
        from_attributes = True
