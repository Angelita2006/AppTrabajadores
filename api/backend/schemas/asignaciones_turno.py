import datetime
from pydantic import BaseModel, Field, model_validator, ConfigDict
from typing import List, Optional
from uuid import UUID
from schemas.contratos import ContratoSimpleResponse
from schemas.turnos import TurnoSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - ASIGNACIONES DE TURNO
# ==========================================

class AsignacionTurnoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una asignación de turno
    basada en el modelo relacional mapeado por sqlacodegen.
    """
    fecha_inicio: datetime.date = Field(..., description="Fecha de inicio de la vigencia del turno en formato AAAA-MM-DD")
    fecha_fin: Optional[datetime.date] = Field(None, description="Fecha de finalización de la vigencia del turno en formato AAAA-MM-DD; NULL si es indefinida")

    model_config = ConfigDict(from_attributes=True)

class AsignacionTurnoCreate(AsignacionTurnoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al asignar un cuadrante
    o turno fijo a un empleado.
    """
    contrato_id: UUID = Field(..., description="ID único UUID del contrato al que se le asigna el turno")
    turno_id: UUID = Field(..., description="ID único UUID del turno laboral teórico asignado")

    @model_validator(mode='after')
    def validar_rango_fechas(self) -> 'AsignacionTurnoCreate':
        """
        Valida que la fecha de finalización sea igual o posterior a la fecha de inicio,
        emulando la restricción CheckConstraint de la base de datos.
        """
        if self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha de finalización de la asignación no puede ser anterior a la fecha de inicio.")
        return self

    model_config = ConfigDict(from_attributes=True)

class AsignacionTurnoMasivaCreate(AsignacionTurnoBase):
    """
    Esquema para la asignación masiva de turnos a un trabajador.
    """
    contrato_id: UUID = Field(..., description="ID único UUID del contrato al que se le asigna el turno")

    fecha_inicio: datetime.date = Field(..., description="Fecha de inicio de vigencia de los turnos")
    fecha_fin: Optional[datetime.date] = Field(None, description="Fecha de fin opcional")
    
    turnos_ids: List[UUID] = Field(..., min_length=1, max_length=100, description="Lista de IDs de turnos a asignar de forma atómica")

    @model_validator(mode='after')
    def validar_rango_fechas_masivo(self) -> 'AsignacionTurnoMasivaCreate':
        if self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha de finalización del lote no puede ser anterior a la fecha de inicio.")
        return self
    model_config = ConfigDict(from_attributes=True)

class AsignacionTurnoUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de una asignación de turno.
    Todos los campos son opcionales para permitir patches limpios.
    """
    fecha_inicio: Optional[datetime.date] = Field(None, description="Nueva fecha de inicio de la vigencia")
    fecha_fin: Optional[datetime.date] = Field(None, description="Nueva fecha de finalización (o NULL para hacerla indefinida)")

    @model_validator(mode='after')
    def validar_rango_fechas_update(self) -> 'AsignacionTurnoUpdate':
        """
        Valida el rango solo si el usuario ha proporcionado ambas fechas en la petición.
        (Si solo se actualiza una, el servicio de backend deberá cruzarla con la fecha existente en BD).
        """
        if self.fecha_inicio and self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha de finalización de la asignación no puede ser anterior a la fecha de inicio.")
        return self

    model_config = ConfigDict(from_attributes=True)

class AsignacionTurnoSimpleResponse(AsignacionTurnoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor devuelve a la app
    para pintar el calendario o la jornada teórica del operario.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) de la asignación de turno")
    contrato_id: UUID = Field(..., description="ID único UUID del contrato al que se le asigna el turno")
    turno_id: UUID = Field(..., description="ID único UUID del turno laboral teórico asignado")

    created_at: datetime.datetime = Field(..., description="Marca de tiempo de creación del registro")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de última actualización real del registro (now)")

    model_config = ConfigDict(from_attributes=True)

class AsignacionTurnoResponse(AsignacionTurnoSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    contrato: Optional[ContratoSimpleResponse] = Field(None, description="Detalles del contrato asociado")
    turno: Optional[TurnoSimpleResponse] = Field(None, description="Detalles del turno laboral asociado")

    model_config = ConfigDict(from_attributes=True)