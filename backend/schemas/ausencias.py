import datetime
from pydantic import BaseModel, Field, model_validator, ConfigDict
from typing import Optional
from uuid import UUID
from core.enums import EstadoAusenciaEnum, TipoAusenciaEnum
from schemas.empresas import EmpresaSimpleResponse
from schemas.trabajadores import TrabajadorSimpleResponse
from schemas.usuarios import UsuarioSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - AUSENCIAS
# ==========================================

class AusenciaBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de cualquier tipo de ausencia.
    """    
    tipo_ausencia: Optional[TipoAusenciaEnum] = Field(None, description="Categoría legal de la ausencia")
    estado: Optional[EstadoAusenciaEnum] = Field(None, description="Estado de la ausencia (pendiente, aprobada, rechazada, cancelada)")

    fecha_inicio: datetime.date = Field(..., description="Fecha de inicio de la ausencia (AAAA-MM-DD)")
    fecha_fin: datetime.date = Field(..., description="Fecha de finalización de la ausencia (AAAA-MM-DD)")

    motivo: str = Field(..., max_length=255, description="Justificación detallada de la solicitud")

    justificante_url: Optional[str] = Field(None, description="URL de la ruta del archivo del justificante de la ausencia")

    fecha_resolucion: Optional[datetime.datetime] = Field(None, description="Fecha en que se resuelve la solicitud de ausencia")
    observaciones_admin: Optional[str] = Field(None, max_length=255, description="Notas añadidas por el validador al aprobar/rechazar la solicitud")

    model_config = ConfigDict(from_attributes=True)

class AusenciaCreate(AusenciaBase):
    """
    Esquema utilizado para recibir solicitudes de vacaciones o bajas.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador afectado")
    usuario_validador_id: Optional[UUID] = Field(None, description="ID único UUID del usuario que valida la ausencia, si aplica")
    
    @model_validator(mode='after')
    def validar_rango_fechas(self) -> 'AusenciaCreate':
        """
        Valida que la fecha de fin sea igual o posterior a la de inicio,
        evitando errores antes de que la consulta toque PostgreSQL.
        """
        if self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha de finalización no puede ser anterior a la fecha de inicio.")
        return self

    model_config = ConfigDict(from_attributes=True)

class AusenciaUpdate(BaseModel):
    """
    Esquema utilizado para modificar solicitudes de vacaciones o bajas.
    """
    usuario_validador_id: Optional[UUID] = Field(None, description="ID único UUID del usuario que valida la ausencia, si aplica")

    tipo_ausencia: Optional[TipoAusenciaEnum] = Field(None, description="Categoría legal de la ausencia")
    estado: Optional[EstadoAusenciaEnum] = Field(None, description="Estado de la ausencia (pendiente, aprobada, rechazada, cancelada)")

    fecha_inicio: Optional[datetime.date] = Field(None, description="Fecha de inicio de la ausencia (AAAA-MM-DD)")
    fecha_fin: Optional[datetime.date] = Field(None, description="Fecha de finalización de la ausencia (AAAA-MM-DD)")

    motivo: Optional[str] = Field(None, max_length=255, description="Justificación detallada de la solicitud")

    justificante_url: Optional[str] = Field(None, description="URL de la ruta del archivo del justificante de la ausencia")

    fecha_resolucion: Optional[datetime.datetime] = Field(None, description="Fecha en que se resuelve la solicitud de ausencia")
    observaciones_admin: Optional[str] = Field(None, max_length=255, description="Notas añadidas por el validador al aprobar/rechazar la solicitud")

    @model_validator(mode='after')
    def validar_rango_fechas(self) -> 'AusenciaUpdate':
        """
        Valida que la fecha de fin sea igual o posterior a la de inicio,
        evitando errores antes de que la consulta toque PostgreSQL.
        """
        if self.fecha_inicio and self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha de finalización no puede ser anterior a la fecha de inicio.")
        return self

    model_config = ConfigDict(from_attributes=True)

class AusenciaSimpleResponse(AusenciaBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la aplicación móvil o web.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) de la ausencia")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador afectado")
    usuario_validador_id: Optional[UUID] = Field(None, description="ID único UUID del usuario que valida la ausencia, si aplica")
    
    model_config = ConfigDict(from_attributes=True)

class AusenciaResponse(AusenciaSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    trabajador: Optional[TrabajadorSimpleResponse] = Field(None, description="Detalles del trabajador afectado")
    usuario_validador: Optional[UsuarioSimpleResponse] = Field(None, description="Detalles del usuario que validó la ausencia")

    model_config = ConfigDict(from_attributes=True)