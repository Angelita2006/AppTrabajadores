import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, Dict
from uuid import UUID
from models.enums import TipoCorreccionEnum, EstadoCorreccionEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - CORRECCIONES
# ==========================================

class CorreccionFichajeBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una corrección de fichaje.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador afectado")
    tipo_correccion: TipoCorreccionEnum = Field(..., description="Tipo de rectificación horaria solicitada")
    fichaje_afectado_id: Optional[UUID] = Field(None, description="ID del fichaje original que se desea corregir o anular")
    valor_anterior: Optional[Dict[str, Any]] = Field(None, description="Valores previos almacenados en formato JSON")
    valor_nuevo: Optional[Dict[str, Any]] = Field(None, description="Nuevos valores propuestos en formato JSON")
    motivo: str = Field(..., min_length=2, description="Justificación detallada de la solicitud de corrección")


class CorreccionFichajeCreate(CorreccionFichajeBase):
    """
    Esquema utilizado para recibir los datos al solicitar una nueva corrección.
    """
    solicitado_por_usuario_id: UUID = Field(..., description="ID del usuario que realiza la petición")


class CorreccionFichajeUpdate(BaseModel):
    """
    Esquema para la actualización opcional de los datos de la corrección.
    """
    tipo_correccion: Optional[TipoCorreccionEnum] = None
    valor_nuevo: Optional[Dict[str, Any]] = None
    motivo: Optional[str] = Field(None, min_length=2)
    estado: Optional[EstadoCorreccionEnum] = None

    model_config = ConfigDict(from_attributes=True)


class CorreccionFichajeResponse(CorreccionFichajeBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado de la corrección")
    estado: EstadoCorreccionEnum = Field(..., description="Estado actual de la solicitud (pendiente, aprobada, rechazada)")
    solicitado_por_usuario_id: UUID = Field(..., description="ID del usuario solicitante")
    resolutor_usuario_id: Optional[UUID] = Field(None, description="ID del usuario que resolvió la incidencia")
    fecha_solicitud: datetime.datetime = Field(..., description="Fecha y hora de la solicitud")
    fecha_resolucion: Optional[datetime.datetime] = Field(None, description="Fecha y hora de la resolución")

    model_config = ConfigDict(from_attributes=True)