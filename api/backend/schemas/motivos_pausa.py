from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from schemas.empresas import EmpresaResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - MOTIVOS DE PAUSA
# ==========================================

class MotivoPausaBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un motivo de pausa
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    nombre: str = Field(..., min_length=2, max_length=100, description="Nombre o descripción corta del tipo de descanso (Ej: 'Comida')")
    computa_como_trabajo: bool = Field(False, description="Determina si el tiempo de esta pausa cuenta como jornada efectiva")

    model_config = ConfigDict(from_attributes=True)

class MotivoPausaCreate(MotivoPausaBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al registrar un nuevo motivo.
    Permite dejar el campo 'empresa_id' vacío para crear una pausa en el catálogo global de la gestoría.
    """
    empresa_id: Optional[UUID] = Field(None, description="ID único UUID de la empresa si es un motivo personalizado, o NULL si es global")
    duracion_max_minutos: Optional[int] = Field(None, ge=1, le=1440, description="Tiempo máximo recomendado para esta pausa (SmallInteger)")

class MotivoPausaUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de un motivo de pausa.
    """
    nombre: Optional[str] = Field(None, min_length=2, max_length=100, description="Nombre o descripción corta del tipo de descanso")
    computa_como_trabajo: Optional[bool] = Field(None, description="Determina si cuenta como jornada efectiva")
    duracion_max_minutos: Optional[int] = Field(None, ge=1, le=1440, description="Tiempo máximo recomendado")

    model_config = ConfigDict(from_attributes=True)

class MotivoPausaSimpleResponse(MotivoPausaBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil o web.
    """
    id: int = Field(..., description="Identificador numérico único de la pausa (SmallInteger)")
    empresa_id: Optional[UUID] = Field(None, description="ID de la empresa si es personalizado o global si es nulo")
    duracion_max_minutos: Optional[int] = Field(None, description="Duración máxima en minutos")

    model_config = ConfigDict(from_attributes=True)

class MotivoPausaResponse(MotivoPausaSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaResponse] = Field(None, description="Detalles de la empresa asociada")

    model_config = ConfigDict(from_attributes=True)