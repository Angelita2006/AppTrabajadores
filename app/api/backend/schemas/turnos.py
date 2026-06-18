import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from core.database import get_db
from empresas import Empresas
from turnos import Turnos

# Inicialización del enrutador modular para el catálogo de turnos teóricos
router = APIRouter(prefix="/api/turnos", tags=["Turnos Laborales"])


# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class TurnoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un turno teórico
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    nombre: str = Field(..., max_length=150, description="Nombre identificativo del turno (Ej: 'Turno Mañana Rotativo')")
    hora_inicio: datetime.time = Field(..., description="Hora de entrada teórica en formato HH:MM:SS")
    hora_fin: datetime.time = Field(..., description="Hora de salida teórica en formato HH:MM:SS")
    duracion_pausa_minutos: int = Field(0, ge=0, description="Minutos de descanso reglamentarios incluidos (SmallInteger)")
    dias_semana: List[int] = Field(
        ..., 
        description="Días laborables del turno. Formato: 1=lunes, 2=martes ... 7=domingo"
    )


class TurnoCreate(TurnoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al configurar un nuevo turno.
    """
    
    @field_validator('dias_semana')
    @classmethod
    def validar_dias_semana(cls, valores: List[int]) -> List[int]:
        """
        Valida que todos los números dentro de la lista estén estrictamente entre 1 y 7,
        emulando la restricción CheckConstraint 'dias_semana_validos' de la base de datos.
        """
        if not valores:
            raise ValueError("El turno debe incluir al menos un día laborable de la semana.")
            
        for dia in valores:
            if dia < 1 or dia > 7:
                raise ValueError(f"El valor de día '{dia}' no es válido. Debe estar comprendido entre 1 (lunes) y 7 (domingo).")
                
        return sorted(list(set(valores)))


class TurnoResponse(TurnoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones.
    """
    id: UUID = Field(..., description="Identificador único UUID del turno autogenerado (gen_random_uuid)")
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de la creación del cuadrante (now)")

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
