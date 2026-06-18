from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class AuditoriaAccesosBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una auditoria de accesos.
    """
    # idTrabajador: int = Field(..., description="ID del trabajador que realiza el marcaje")
    # idEmpresa: int = Field(..., description="ID de la empresa donde se registra la jornada")
    # # Restringe los textos válidos de forma estricta para que coincidan con tu EstadoFichaje de React Native
    # tipo: Literal["entrada", "salida", "descanso", "fin_descanso"] = Field(
    #     ..., description="Tipo de evento horario registrado"
    # )


class AuditoriaAccesosCreate(AuditoriaAccesosBase):
    """
    Esquema utilizado para recibir los datos desde la app móvil al auditar un acceso.
    No requiere campos de fecha u hora ya que el backend los calcula de forma automática.
    """
    pass  # Hereda los campos obligatorios de AuditoriaAccesosBase sin añadir nuevos


class AuditoriaAccesosResponse(AuditoriaAccesosBase):
    """
    Esquema utilizado para moldear las respuestas JSON que el servidor envía a la app.
    Incluye las marcas de tiempo temporales generadas por la base de datos.
    """
    # id: int = Field(..., description="Identificador único secuencial del registro")
    # fecha: int = Field(..., description="Marca de tiempo numérica en milisegundos o segundos (timestamp)")
    # fecha_hora: datetime = Field(..., description="Objeto de fecha y hora nativo del sistema")

    class Config:
        # Permite que Pydantic lea directamente las propiedades del objeto AuditoriaAccesos de SQLAlchemy
        from_attributes = True