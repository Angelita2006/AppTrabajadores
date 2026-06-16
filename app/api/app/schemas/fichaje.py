from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class FichajeBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un fichaje.
    """
    idTrabajador: int = Field(..., description="ID del trabajador que realiza el marcaje")
    idEmpresa: int = Field(..., description="ID de la empresa donde se registra la jornada")
    # Restringe los textos válidos de forma estricta para que coincidan con tu EstadoFichaje de React Native
    tipo: Literal["entrada", "salida", "descanso", "fin_descanso"] = Field(
        ..., description="Tipo de evento horario registrado"
    )


class FichajeCreate(FichajeBase):
    """
    Esquema utilizado para recibir los datos desde la app móvil al fichar.
    No requiere campos de fecha u hora ya que el backend los calcula de forma automática.
    """
    pass  # Hereda los campos obligatorios de FichajeBase sin añadir nuevos


class FichajeResponse(FichajeBase):
    """
    Esquema utilizado para moldear las respuestas JSON que el servidor envía a la app.
    Incluye las marcas de tiempo temporales generadas por la base de datos.
    """
    id: int = Field(..., description="Identificador único secuencial del registro")
    fecha: int = Field(..., description="Marca de tiempo numérica en milisegundos o segundos (timestamp)")
    fecha_hora: datetime = Field(..., description="Objeto de fecha y hora nativo del sistema")

    class Config:
        # Permite que Pydantic lea directamente las propiedades del objeto Fichaje de SQLAlchemy
        from_attributes = True

# # Ejemplo rápido de inserción interna en tu CRUD:
# ahora = datetime.now()
# nuevo_fichaje = Fichaje(
#     idTrabajador=fichaje_in.idTrabajador,
#     idEmpresa=fichaje_in.idEmpresa,
#     tipo=fichaje_in.tipo,
#     fecha=int(ahora.timestamp()),  # Genera el número secuencial entero automático
#     fecha_hora=ahora               # Genera el objeto DateTime automático
# )

# ejemplo al recibir el historial
# {
#   "id": 105,
#   "idTrabajador": 1,
#   "idEmpresa": 2,
#   "tipo": "entrada",
#   "fecha": 1781548800,
#   "fecha_hora": "2026-06-15T19:57:00"
# }
