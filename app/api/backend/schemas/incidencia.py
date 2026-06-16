from pydantic import BaseModel, Field
from typing import Optional

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class IncidenciaBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un reporte de incidencia.
    """
    idTrabajador: int = Field(..., description="ID del trabajador que reporta el problema")
    idEmpresa: int = Field(..., description="ID de la empresa donde consta la incidencia")
    tipo: str = Field("olvido_fichaje", max_length=50, description="Tipo o categoría del problema")
    fecha: str = Field(..., max_length=10, description="Fecha del día afectado en formato AAAA-MM-DD")
    descripcion: str = Field(..., description="Detalles explicativos del suceso")


class IncidenciaCreate(IncidenciaBase):
    """
    Esquema utilizado para recibir los reportes enviados desde el teléfono móvil.
    El estado inicial se omite porque la base de datos lo marca como 'abierta' por defecto.
    """
    pass  # Hereda los campos obligatorios de IncidenciaBase sin añadir nuevos


class IncidenciaResponse(IncidenciaBase):
    """
    Esquema utilizado para moldear las respuestas JSON que el servidor envía a la app.
    Devuelve los datos del registro junto con su estado actual de resolución.
    """
    id: int = Field(..., description="Identificador único del reporte")
    estado: str = Field(..., description="Estado del reporte: 'abierta' o 'resuelta'")

    class Config:
        # Permite que Pydantic lea directamente las propiedades del objeto Incidencia de SQLAlchemy
        from_attributes = True
