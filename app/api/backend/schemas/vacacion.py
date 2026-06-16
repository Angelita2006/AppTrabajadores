from pydantic import BaseModel, Field
from typing import Optional

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class VacacionBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una solicitud de vacaciones.
    """
    idTrabajador: int = Field(..., description="ID del trabajador que solicita los días libres")
    idEmpresa: int = Field(..., description="ID de la empresa donde trabaja")
    fechaInicio: str = Field(..., max_length=10, description="Fecha de inicio en formato AAAA-MM-DD")
    fechaFin: str = Field(..., max_length=10, description="Fecha de finalización en formato AAAA-MM-DD")
    motivo: str = Field(..., description="Descripción o motivo del periodo vacacional")


class VacacionCreate(VacacionBase):
    """
    Esquema utilizado para recibir los datos desde el formulario de la app móvil.
    No requiere el campo 'id' ni 'estado' porque la base de datos los gestiona sola.
    """
    pass  # Hereda los campos obligatorios de VacacionBase sin añadir nuevos


class VacacionResponse(VacacionBase):
    """
    Esquema utilizado para moldear las respuestas JSON que el servidor envía a la app.
    Incluye el ID autogenerado y el estado de la aprobación.
    """
    id: int = Field(..., description="Identificador único de la solicitud")
    estado: str = Field(..., description="Estado de la solicitud: 'pendiente', 'aprobada' o 'rechazada'")

    class Config:
        # Permite que Pydantic lea directamente las propiedades del objeto Vacacion de SQLAlchemy
        from_attributes = True
