import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from core.enums import MetodoFichajeEnum
from schemas.centros_trabajo import CentroTrabajoSimpleResponse
from schemas.empresas import EmpresaSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - DISPOSITIVOS DE FICHAJE
# ==========================================

class DispositivoFichajeBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un dispositivo de fichaje.
    """
    tipo_dispositivo: MetodoFichajeEnum = Field(..., description="Método o tipo de dispositivo (RFID, app, QR, etc.)")
    activo: Optional[bool] = Field(None, description="Indica si el dispositivo de fichaje está activo o no")

    model_config = ConfigDict(from_attributes=True)

class DispositivoFichajeCreate(DispositivoFichajeBase):
    """
    Esquema utilizado para registrar un nuevo punto o medio de fichaje autorizado en el backend.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    centro_trabajo_id: UUID = Field(..., description="ID único UUID del centro de trabajo")

    model_config = ConfigDict(from_attributes=True)

class DispositivoFichajeUpdate(BaseModel):
    """
    Esquema utilizado para actualizar un dispositivo existente sin exigir campos fijos.
    """
    tipo_dispositivo: Optional[MetodoFichajeEnum] = Field(None, description="Método o tipo de dispositivo (RFID, app, QR, etc.)")
    activo: Optional[bool] = Field(None, description="Indica si el dispositivo de fichaje está activo o no")

    model_config = ConfigDict(from_attributes=True)

class DispositivoFichajeSimpleResponse(DispositivoFichajeBase):
    """
    Esquema utilizado para empaquetar las respuestas JSON destinadas a la consulta de dispositivos.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del dispositivo de fichaje")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    centro_trabajo_id: UUID = Field(..., description="ID único UUID del centro de trabajo")

    created_at: datetime.datetime = Field(..., description="Fecha y hora de inserción real del registro")
    updated_at: datetime.datetime = Field(..., description="Fecha y hora de la última actualización de datos")

    model_config = ConfigDict(from_attributes=True)

class DispositivoFichajeResponse(DispositivoFichajeSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    centro_trabajo: Optional[CentroTrabajoSimpleResponse] = Field(None, description="Detalles del centro de trabajo asociado")

    model_config = ConfigDict(from_attributes=True)