import datetime
from pydantic import BaseModel, Field, IPvAnyAddress, model_validator
from typing import Optional
from uuid import UUID
from models.enums import EstadoAusenciaEnum, TipoAusenciaEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
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
    motivo: str = Field(..., description="Justificación detallada de la solicitud")


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
    
    # Campos opcionales que se rellenan en la resolución de RRHH
    justificante_metadata: Optional[dict] = Field(None)
    validado_por_usuario_id: Optional[UUID] = Field(None)
    fecha_resolucion: Optional[datetime.datetime] = Field(None)
    observaciones_admin: Optional[str] = Field(None)

    class Config:
        # Habilita la conversión automática desde los objetos de SQLAlchemy 2.0
        from_attributes = True