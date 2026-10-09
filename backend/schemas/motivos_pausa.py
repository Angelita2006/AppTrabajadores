import datetime

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from schemas.empresas import EmpresaSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - MOTIVOS DE PAUSA
# ==========================================

class MotivoPausaBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un motivo de pausa
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    nombre: str = Field(..., max_length=100, description="Nombre o descripción corta del tipo de descanso (Ej: 'Comida')")
    computa_como_trabajo: Optional[bool] = Field(None, description="Determina si el tiempo de esta pausa cuenta como jornada efectiva")
    duracion_max_minutos: Optional[int] = Field(None, description="Duración máxima en minutos para este motivo de pausa")

    model_config = ConfigDict(from_attributes=True)

class MotivoPausaCreate(MotivoPausaBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al registrar un nuevo motivo.
    Permite dejar el campo 'empresa_id' vacío para crear una pausa en el catálogo global de la gestoría.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa asociada")

    model_config = ConfigDict(from_attributes=True)

class MotivoPausaUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de un motivo de pausa.
    """
    nombre: Optional[str] = Field(None, max_length=100, description="Nombre o descripción corta del tipo de descanso (Ej: 'Comida')")
    computa_como_trabajo: Optional[bool] = Field(None, description="Determina si el tiempo de esta pausa cuenta como jornada efectiva")
    duracion_max_minutos: Optional[int] = Field(None, description="Duración máxima en minutos para este motivo de pausa")

    model_config = ConfigDict(from_attributes=True)

class MotivoPausaSimpleResponse(MotivoPausaBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil o web.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del motivo de pausa")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa asociada")
    
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")
    
    model_config = ConfigDict(from_attributes=True)

class MotivoPausaResponse(MotivoPausaSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")

    model_config = ConfigDict(from_attributes=True)