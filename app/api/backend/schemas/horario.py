from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class HorarioBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un horario laboral.
    """
    idTrabajador: int = Field(..., description="ID del trabajador titular del horario")
    idEmpresa: int = Field(..., description="ID de la empresa que asigna el cuadrante")
    tipoJornada: str = Field(..., max_length=50, description="Ej: 'Jornada Completa', 'Intensiva', 'Partida'")
    dias: int = Field(..., description="Cantidad total de días laborables a la semana")
    diasSemana: str = Field(..., max_length=20, description="Letras de los días asignados (ej: 'L M X J V')")
    hora_entrada1: datetime = Field(..., description="Hora de entrada para el primer tramo de la jornada")
    hora_salida1: datetime = Field(..., description="Hora de salida para el primer tramo de la jornada")
    
    # Tramos secundarios opcionales (obligatorios solo en jornadas partidas o turnos partidos)
    hora_entrada2: Optional[datetime] = Field(None, description="Hora de entrada para el segundo tramo")
    hora_salida2: Optional[datetime] = Field(None, description="Hora de salida para el segundo tramo")


class HorarioCreate(HorarioBase):
    """
    Esquema utilizado para recibir los datos al asignar un nuevo horario desde el backend o panel web.
    No requiere el campo 'id' ya que la base de datos lo autogenera de forma secuencial.
    """
    pass  # Hereda todos los campos obligatorios de HorarioBase sin añadir nuevos


class HorarioResponse(HorarioBase):
    """
    Esquema utilizado para moldear las respuestas JSON que el servidor envía a la app.
    Incluye el identificador único autogenerado.
    """
    id: int = Field(..., description="Identificador único del registro de planificación")

    class Config:
        # Permite que Pydantic lea directamente las propiedades del objeto Horario de SQLAlchemy
        from_attributes = True

# ejemplo: 
# {
#   "id": 12,
#   "idTrabajador": 1,
#   "idEmpresa": 2,
#   "tipoJornada": "Jornada Partida",
#   "dias": 5,
#   "diasSemana": "L M X J V",
#   "hora_entrada1": "2026-06-15T08:00:00",
#   "hora_salida1": "2026-06-15T14:00:00",
#   "hora_entrada2": "2026-06-15T16:00:00",
#   "hora_salida2": "2026-06-15T18:00:00"
# }
