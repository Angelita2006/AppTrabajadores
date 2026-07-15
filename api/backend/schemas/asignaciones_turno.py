import datetime
from pydantic import BaseModel, Field, model_validator
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class AsignacionTurnoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una asignación de turno
    basada en el modelo relacional mapeado por sqlacodegen.
    """
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador al que se le asigna el turno")
    turno_id: UUID = Field(..., description="ID único UUID del turno laboral teórico asignado")
    fecha_inicio: datetime.date = Field(..., description="Fecha de inicio de la vigencia del turno en formato AAAA-MM-DD")


class AsignacionTurnoCreate(AsignacionTurnoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al asignar un cuadrante
    o turno fijo a un empleado.
    """
    fecha_fin: Optional[datetime.date] = Field(None, description="Fecha de finalización de la vigencia del turno si aplica")

    @model_validator(mode='after')
    def validar_rango_fechas(self) -> 'AsignacionTurnoCreate':
        """
        Valida que la fecha de finalización sea igual o posterior a la fecha de inicio,
        emulando la restricción CheckConstraint de la base de datos.
        """
        if self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha de finalización de la asignación no puede ser anterior a la fecha de inicio.")
        return self


class AsignacionTurnoResponse(AsignacionTurnoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor devuelve a la app
    para pintar el calendario o la jornada teórica del operario.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    
    # Propiedades complementarias opcionales expuestas en el JSON
    fecha_fin: Optional[datetime.date] = Field(None)
    created_at: Optional[datetime.date] = Field(None)

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
