import datetime
from pydantic import BaseModel, Field, model_validator, ConfigDict
from typing import Optional
from uuid import UUID
from core.enums import EstadoAusenciaEnum, TipoAusenciaEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - AUSENCIAS
# ==========================================

class AusenciaBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de cualquier tipo de ausencia.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador afectado")
    tipo_ausencia: TipoAusenciaEnum = Field(..., description="Categoría legal de la ausencia")
    fecha_inicio: datetime.date = Field(..., description="Fecha de inicio de la ausencia (AAAA-MM-DD)")
    fecha_fin: datetime.date = Field(..., description="Fecha de finalización de la ausencia (AAAA-MM-DD)")
    motivo: str = Field(..., min_length=2, max_length=1000, description="Justificación detallada de la solicitud")

class AusenciaCreate(AusenciaBase):
    """
    Esquema utilizado para recibir solicitudes de vacaciones o bajas desde el dispositivo móvil.
    """
    justificante_metadata: Optional[dict] = Field(default_factory=dict, description="Metadatos o enlaces al justificante")

    @model_validator(mode='after')
    def validar_rango_fechas(self) -> 'AusenciaCreate':
        """
        Valida que la fecha de fin sea igual o posterior a la de inicio,
        evitando errores antes de que la consulta toque PostgreSQL.
        """
        if self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha de finalización no puede ser anterior a la fecha de inicio.")
        return self

class AusenciaResponse(AusenciaBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la aplicación móvil o web.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado")
    estado: EstadoAusenciaEnum = Field(..., description="Estado de la solicitud (pendiente, aprobada, rechazada)")
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de la solicitud")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación")
    
    justificante_metadata: Optional[dict] = Field(None, description="Metadatos o enlaces del justificante")
    validado_por_usuario_id: Optional[UUID] = Field(None, description="ID del usuario que validó la ausencia")
    fecha_resolucion: Optional[datetime.datetime] = Field(None, description="Fecha de resolución de la solicitud")
    observaciones_admin: Optional[str] = Field(None, max_length=1000, description="Notas añadidas por el validador")

    model_config = ConfigDict(from_attributes=True)