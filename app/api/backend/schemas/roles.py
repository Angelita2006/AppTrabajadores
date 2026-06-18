from pydantic import BaseModel, Field
from typing import Optional

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class RolBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un rol del sistema (RBAC)
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    nombre: str = Field(..., max_length=100, description="Nombre único del rol (Ej: 'admin_empresa', 'trabajador')")


class RolCreate(RolBase):
    """
    Esquema utilizado para recibir los datos al registrar un nuevo rol en la plataforma.
    """
    descripcion: Optional[str] = Field(None, max_length=255, description="Explicación detallada de las funciones de este rol")


class RolResponse(RolBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones
    para mapear los perfiles de usuario.
    """
    id: int = Field(..., description="Identificador numérico único del rol (SmallInteger)")
    
    # Propiedades complementarias opcionales expuestas en el JSON
    descripcion: Optional[str] = Field(None)

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
