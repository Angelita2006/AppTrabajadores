import datetime
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from enums import TipoCorreccionEnum, EstadoCorreccionEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class CorreccionFichajeBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una corrección de fichaje
    basada en el modelo relacional inmutable mapeado por sqlacodegen.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador afectado")
    tipo_correccion: TipoCorreccionEnum = Field(..., description="Categoría de la corrección: alta_manual, modificacion o anulacion")
    valor_nuevo: dict = Field(..., description="Bloque JSONB con los nuevos parámetros del marcaje propuesto")
    motivo: str = Field(..., description="Texto justificativo obligatorio que describe la causa del cambio")


class CorreccionFichajeCreate(CorreccionFichajeBase):
    """
    Esquema utilizado para recibir las solicitudes de corrección enviadas por los trabajadores
    o el departamento de rrhh desde la interfaz de la aplicación.
    """
    solicitado_por_usuario_id: UUID = Field(..., description="ID UUID del usuario de la sesión que inicia el reporte")
    fichaje_afectado_id: Optional[UUID] = Field(None, description="ID UUID del fichaje original (obligatorio en modificaciones o anulaciones)")
    valor_anterior: Optional[dict] = Field(None, description="Bloque JSONB opcional con una copia de seguridad del marcaje previo")


class CorreccionFichajeResponse(CorreccionFichajeBase):
    """
    Esquema utilizado para moldear las respuestas JSON que el servidor envía a las aplicaciones.
    Muestra la trazabilidad horaria completa y los identificadores de auditoría legal.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    solicitado_por_usuario_id: UUID = Field(..., description="ID UUID del usuario solicitante")
    estado: EstadoCorreccionEnum = Field(..., description="Estado del flujo: 'pendiente', 'aprobada' o 'rechazada'")
    fecha_solicitud: datetime.datetime = Field(..., description="Marca de tiempo real de creación de la solicitud (now)")
    
    # Propiedades complementarias opcionales calculadas durante la resolución
    fichaje_afectado_id: Optional[UUID] = Field(None)
    valor_anterior: Optional[dict] = Field(None)
    aprobado_por_usuario_id: Optional[UUID] = Field(None, description="ID UUID del administrador o rrhh que valida el cambio")
    fecha_resolucion: Optional[datetime.datetime] = Field(None, description="Marca de tiempo en la que se aprobó o rechazó la solicitud")

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
