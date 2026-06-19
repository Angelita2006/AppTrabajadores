import datetime
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from models.enums import MetodoFichajeEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class DispositivoFichajeBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un dispositivo de fichaje
    basado en el modelo mapeado por sqlacodegen.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    tipo_dispositivo: MetodoFichajeEnum = Field(..., description="Método o tipo de dispositivo (RFID, app, QR, etc.)")
    identificador: str = Field(..., max_length=100, description="Código único, MAC o número de serie del terminal")


class DispositivoFichajeCreate(DispositivoFichajeBase):
    """
    Esquema utilizado para registrar un nuevo punto o medio de fichaje autorizado en el backend.
    """
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID del centro de trabajo físico asignado")
    ubicacion: Optional[str] = Field(None, max_length=255, description="Descripción física de la ubicación (Ej: 'Entrada principal')")


class DispositivoFichajeResponse(DispositivoFichajeBase):
    """
    Esquema utilizado para empaquetar las respuestas JSON destinadas a la consulta de dispositivos.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    activo: bool = Field(..., description="Determina si el dispositivo tiene permitido registrar marcajes")
    fecha_alta: datetime.date = Field(..., description="Fecha de alta del terminal en la plataforma")
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última actualización de datos")
    
    # Propiedades complementarias opcionales
    centro_trabajo_id: Optional[UUID] = Field(None)
    ubicacion: Optional[str] = Field(None)

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
