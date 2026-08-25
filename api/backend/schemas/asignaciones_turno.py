from datetime import date, datetime
from pydantic import BaseModel, Field, model_validator, ConfigDict
from typing import List, Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - ASIGNACIONES DE TURNO
# ==========================================

class AsignacionTurnoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una asignación de turno
    basada en el modelo relacional mapeado por sqlacodegen.
    """
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador al que se le asigna el turno")
    turno_id: UUID = Field(..., description="ID único UUID del turno laboral teórico asignado")
    fecha_inicio: date = Field(..., description="Fecha de inicio de la vigencia del turno en formato AAAA-MM-DD")

class AsignacionTurnoCreate(AsignacionTurnoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al asignar un cuadrante
    o turno fijo a un empleado.
    """
    fecha_fin: Optional[date] = Field(None, description="Fecha de finalización de la vigencia del turno si aplica")

    @model_validator(mode='after')
    def validar_rango_fechas(self) -> 'AsignacionTurnoCreate':
        """
        Valida que la fecha de finalización sea igual o posterior a la fecha de inicio,
        emulando la restricción CheckConstraint de la base de datos.
        """
        if self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha de finalización de la asignación no puede ser anterior a la fecha de inicio.")
        return self

class AsignacionTurnoMasivaCreate(BaseModel):
    """
    Esquema validado para la asignación masiva de múltiples turnos a un trabajador.
    """
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador")
    turnos_ids: List[UUID] = Field(..., min_length=1, max_length=100, description="Lista de IDs de turnos a asignar de forma atómica")
    fecha_inicio: date = Field(..., description="Fecha de inicio de vigencia para todos los turnos del lote")
    fecha_fin: Optional[date] = Field(None, description="Fecha de finalización opcional para el lote")

    @model_validator(mode='after')
    def validar_rango_fechas_masivo(self) -> 'AsignacionTurnoMasivaCreate':
        if self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha de finalización del lote no puede ser anterior a la fecha de inicio.")
        return self

class AsignacionTurnoResponse(AsignacionTurnoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor devuelve a la app
    para pintar el calendario o la jornada teórica del operario.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    fecha_fin: Optional[date] = Field(None, description="Fecha de finalización de la asignación")
    created_at: Optional[datetime] = Field(None, description="Fecha de creación del registro")

    model_config = ConfigDict(from_attributes=True)