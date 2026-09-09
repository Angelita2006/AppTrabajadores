import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from core.enums import MetodoFichajeEnum
from schemas.centros_trabajo import CentroTrabajoSimpleResponse
from schemas.empresas import EmpresaResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - DISPOSITIVOS DE FICHAJE
# ==========================================

class DispositivoFichajeBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un dispositivo de fichaje.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    tipo_dispositivo: MetodoFichajeEnum = Field(..., description="Método o tipo de dispositivo (RFID, app, QR, etc.)")

    model_config = ConfigDict(from_attributes=True)

class DispositivoFichajeCreate(DispositivoFichajeBase):
    """
    Esquema utilizado para registrar un nuevo punto o medio de fichaje autorizado en el backend.
    """
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID del centro de trabajo físico asignado")
    activo: Optional[bool] = Field(True, description="Estado de activación inicial del dispositivo")

class DispositivoFichajeUpdate(BaseModel):
    """
    Esquema utilizado para actualizar un dispositivo existente sin exigir campos fijos.
    """
    empresa_id: Optional[UUID] = Field(None, description="ID opcional de la empresa")
    tipo_dispositivo: Optional[MetodoFichajeEnum] = Field(None, description="Método o tipo de dispositivo")
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID del centro de trabajo físico asignado")
    activo: Optional[bool] = Field(None, description="Estado de activación del dispositivo")

    model_config = ConfigDict(from_attributes=True)

class DispositivoFichajeSimpleResponse(DispositivoFichajeBase):
    """
    Esquema utilizado para empaquetar las respuestas JSON destinadas a la consulta de dispositivos.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    activo: bool = Field(..., description="Determina si el dispositivo tiene permitido registrar marcajes")
    fecha_alta: datetime.date = Field(..., description="Fecha de alta del terminal en la plataforma")
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última actualización de datos")
    
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID del centro de trabajo físico asignado")

    model_config = ConfigDict(from_attributes=True)

class DispositivoFichajeResponse(DispositivoFichajeSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaResponse] = Field(None, description="Detalles de la empresa asociada")
    centro_trabajo: Optional[CentroTrabajoSimpleResponse] = Field(None, description="Detalles del centro de trabajo asociado")

    model_config = ConfigDict(from_attributes=True)