from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, Field

class DispositivoPushBase(BaseModel):
    fcm_token: str = Field(..., description="Token único de Firebase Cloud Messaging")
    plataforma: Optional[str] = Field(None, max_length=20, description="Plataforma del dispositivo: 'ios', 'android' o 'web'")

class DispositivoPushCreate(DispositivoPushBase):
    usuario_id: uuid.UUID = Field(..., description="ID del usuario dueño del dispositivo")

class DispositivoPushUpdate(BaseModel):
    fcm_token: Optional[str] = None
    plataforma: Optional[str] = Field(None, max_length=20)

class DispositivoPushResponse(DispositivoPushBase):
    id: uuid.UUID
    usuario_id: uuid.UUID
    updated_at: datetime

    class Config:
        from_attributes = True