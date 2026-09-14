from typing import Optional
import uuid
from pydantic import BaseModel, Field, ConfigDict
from schemas.empresas import EmpresaResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - TIPOS EVENTO FICHAJE
# ==========================================

class TipoEventoFichajeBase(BaseModel):
    """
    Propiedades base compartidas para los tipos de evento de fichaje.
    """
    codigo: str = Field(..., max_length=30)
    descripcion: str = Field(..., max_length=150)
    computa_como_trabajo: bool = True

    model_config = ConfigDict(from_attributes=True)

class TipoEventoFichajeCreate(TipoEventoFichajeBase):
    """
    Esquema utilizado para crear un nuevo tipo de evento de fichaje.
    """
    empresa_id: Optional[uuid.UUID] = None

class TipoEventoFichajeUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de un tipo de evento de fichaje.
    """
    codigo: Optional[str] = Field(None, max_length=30)
    descripcion: Optional[str] = Field(None, max_length=150)
    computa_como_trabajo: Optional[bool] = None
    activo: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)

class TipoEventoFichajeSimpleResponse(TipoEventoFichajeBase):
    """
    Esquema utilizado para estructurar las respuestas JSON de los tipos de evento de fichaje.
    """
    id: Optional[uuid.UUID] = None
    empresa_id: Optional[uuid.UUID] = None
    activo: bool = True

    model_config = ConfigDict(from_attributes=True)

class TipoEventoFichajeResponse(TipoEventoFichajeSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaResponse] = Field(None, description="Detalles de la empresa asociada")

    model_config = ConfigDict(from_attributes=True)