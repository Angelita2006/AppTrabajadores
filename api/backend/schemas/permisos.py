from pydantic import BaseModel, Field
from typing import Optional

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class PermisoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un permiso del sistema (RBAC)
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    codigo: str = Field(..., max_length=100, description="Código único del permiso en formato slug (Ej: 'fichajes.fichar')")


class PermisoCreate(PermisoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente o scripts de migración
    al dar de alta un nuevo permiso operativo en la plataforma.
    """
    descripcion: Optional[str] = Field(None, max_length=255, description="Texto explicativo sobre qué acción autoriza este permiso")


class PermisoResponse(PermisoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones
    para auditar o pintar las capacidades del usuario en la interfaz.
    """
    id: int = Field(..., description="Identificador numérico único del permiso (SmallInteger)")
    
    # Propiedades complementarias opcionales expuestas en el JSON
    descripcion: Optional[str] = Field(None)

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
