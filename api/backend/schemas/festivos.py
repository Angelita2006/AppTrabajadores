import datetime
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class FestivoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un día festivo
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    calendario_id: UUID = Field(..., description="ID único UUID del calendario laboral al que se asocia")
    fecha: datetime.date = Field(..., description="Fecha del día festivo en formato AAAA-MM-DD")
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
    
    # Propiedades complementarias opcionales expuestas en el JSON
    descripcion: Optional[str] = Field(None)

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
