from pydantic import BaseModel, Field

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class TipoEventoFichajeBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un tipo de evento,
    basado en el catálogo global e inmutable de la plataforma.
    """
    codigo: str = Field(..., max_length=30, description="Código único identificativo en mayúsculas (Ej: 'ENTRADA', 'SALIDA')")
    descripcion: str = Field(..., max_length=150, description="Texto explicativo del evento (Ej: 'Entrada a la jornada')")
    computa_como_trabajo: bool = Field(True, description="Determina si el tiempo transcurrido tras este evento suma como jornada efectiva")


class TipoEventoFichajeCreate(TipoEventoFichajeBase):
    """
    Esquema utilizado para recibir los datos desde el cliente o scripts de migración
    al dar de alta una nueva categoría de marcaje horario en el servidor.
    """
    pass  # Hereda todos los campos obligatorios de TipoEventoFichajeBase sin añadir nuevos


class TipoEventoFichajeResponse(TipoEventoFichajeBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones
    para mapear los botones de acción rápida y el historial.
    """
    id: int = Field(..., description="Identificador numérico único del tipo de evento (SmallInteger)")

    class Config:
        # Habilita el modo de conversión directa para los modelos tipados de SQLAlchemy 2.0
        from_attributes = True
