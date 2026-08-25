from typing import Optional
import uuid

from pydantic import BaseModel, Field, ConfigDict

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - TIPOS EVENTO FICHAJE
# ==========================================

class TipoEventoFichajeBase(BaseModel):
    codigo: str = Field(..., max_length=30)
    descripcion: str = Field(..., max_length=150)
    computa_como_trabajo: bool = True

class TipoEventoFichajeCreate(TipoEventoFichajeBase):
    empresa_id: Optional[uuid.UUID] = None

class TipoEventoFichajeUpdate(BaseModel):
    codigo: Optional[str] = Field(None, max_length=30)
    descripcion: Optional[str] = Field(None, max_length=150)
    computa_como_trabajo: Optional[bool] = None

class TipoEventoFichajeResponse(TipoEventoFichajeBase):
    id: int
    empresa_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True