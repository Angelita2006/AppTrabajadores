from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - ROLES
# ==========================================

class RolBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un rol del sistema (RBAC)
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    nombre: str = Field(..., min_length=2, max_length=100, description="Nombre único del rol (Ej: 'admin_empresa', 'trabajador')")

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
    id: UUID = Field(..., description="Identificador único UUID del rol")
    descripcion: Optional[str] = Field(None, description="Explicación detallada de las funciones de este rol")

    model_config = ConfigDict(from_attributes=True)