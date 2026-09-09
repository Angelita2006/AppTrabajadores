from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, Field, ConfigDict
from schemas.usuarios import UsuarioSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - DISPOSITIVOS PUSH
# ==========================================

class DispositivoPushBase(BaseModel):
    fcm_token: str = Field(..., description="Token único de Firebase Cloud Messaging")
    plataforma: Optional[str] = Field(None, max_length=20, description="Plataforma del dispositivo: 'ios', 'android' o 'web'")

    model_config = ConfigDict(from_attributes=True)

class DispositivoPushCreate(DispositivoPushBase):
    usuario_id: uuid.UUID = Field(..., description="ID del usuario dueño del dispositivo")

class DispositivoPushUpdate(BaseModel):
    fcm_token: Optional[str] = None
    plataforma: Optional[str] = Field(None, max_length=20)

    model_config = ConfigDict(from_attributes=True)

class DispositivoPushSimpleResponse(DispositivoPushBase):
    id: uuid.UUID
    usuario_id: uuid.UUID
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DispositivoPushResponse(DispositivoPushSimpleResponse):
    usuario: Optional[UsuarioSimpleResponse] = Field(None, description="Detalles del usuario asociado")

    model_config = ConfigDict(from_attributes=True)