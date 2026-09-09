from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
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
    descripcion: Optional[str] = Field(None, max_length=255, description="Explicación detallada de las funciones de este rol")

    model_config = ConfigDict(from_attributes=True)

class RolCreate(RolBase):
    """
    Esquema utilizado para recibir los datos al registrar un nuevo rol en la plataforma.
    """
    pass

class RolUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de los datos de un rol.
    """
    nombre: Optional[str] = Field(None, min_length=2, max_length=100, description="Nombre único del rol")
    descripcion: Optional[str] = Field(None, max_length=255, description="Explicación detallada de las funciones de este rol")

    model_config = ConfigDict(from_attributes=True)

class RolResponse(RolBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones
    para mapear los perfiles de usuario.
    """
    id: UUID = Field(..., description="Identificador único UUID del rol")

    model_config = ConfigDict(from_attributes=True)