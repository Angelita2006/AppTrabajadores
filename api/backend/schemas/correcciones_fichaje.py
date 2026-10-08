import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, Dict
from uuid import UUID
from core.enums import TipoCorreccionEnum, EstadoCorreccionEnum, TipoEventoFichajeEnum
from schemas.empresas import EmpresaSimpleResponse
from schemas.trabajadores import TrabajadorSimpleResponse
from schemas.usuarios import UsuarioSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - CORRECCIONES
# ==========================================

class CorreccionFichajeBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una corrección de fichaje.
    """
    id: Optional[UUID] = Field(..., description="ID único UUID autogenerado (gen_random_uuid) de la corrección de fichaje")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador afectado")
    usuario_aprobador_id: UUID = Field(..., description="ID único UUID del usuario que ha aprobado la corrección de fichaje")
    usuario_solicitador_id: Optional[UUID] = Field(None, description="ID único UUID del usuario que ha solicitado la corrección de fichaje")
    fichaje_afectado_id: Optional[UUID] = Field(None, description="ID del fichaje original que se desea corregir o anular")

    tipo_evento: TipoEventoFichajeEnum = Field(..., description="Tipo fijo del evento de fichaje correspondiente")
    tipo_correccion: TipoCorreccionEnum = Field(..., description="Tipo de rectificación horaria solicitada")
    
    valor_nuevo: Optional[Dict[str, Any]] = Field(None, description="Nuevos valores propuestos en formato JSON")
    valor_anterior: Optional[Dict[str, Any]] = Field(None, description="Valores previos almacenados en formato JSON")
    
    estado: EstadoCorreccionEnum = Field(..., description="Estado de la corrección de fichaje")
    motivo: str = Field(..., max_length=255, description="Justificación detallada de la solicitud de corrección")

    fecha_solicitud: datetime.datetime = Field(..., description="Fecha y hora en que se realizó la solicitud de corrección")
    fecha_resolucion: Optional[datetime.datetime] = Field(..., description="Fecha y hora en que se realizó la resolución de la corrección")

    firma_solicitante: str = Field(..., description="Firma del solicitante de la corrección")
    firma_resolutor: Optional[str] = Field(..., description="Firma del resolutor de la corrección")

    model_config = ConfigDict(from_attributes=True)

class CorreccionFichajeCreate(CorreccionFichajeBase):
    """
    Esquema utilizado para recibir los datos al solicitar una nueva corrección.
    """
    model_config = ConfigDict(from_attributes=True)

class CorreccionFichajeUpdate(CorreccionFichajeBase):
    """
    Esquema para la actualización opcional de los datos de la corrección.
    """
    model_config = ConfigDict(from_attributes=True)

class CorreccionFichajeSimpleResponse(CorreccionFichajeBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz.
    """
    model_config = ConfigDict(from_attributes=True)

class CorreccionFichajeResponse(CorreccionFichajeSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    trabajador: Optional[TrabajadorSimpleResponse] = Field(None, description="Detalles del trabajador afectado")
    solicitado_por_usuario: Optional[UsuarioSimpleResponse] = Field(None, description="Detalles del usuario solicitante")
    aprobado_por_usuario: Optional[UsuarioSimpleResponse] = Field(None, description="Detalles del usuario que aprobó la solicitud")

    model_config = ConfigDict(from_attributes=True)