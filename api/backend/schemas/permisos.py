from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - PERMISOS
# ==========================================

class PermisoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un permiso del sistema (RBAC)
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    codigo: str = Field(..., min_length=2, max_length=100, description="Código único del permiso en formato slug (Ej: 'fichajes.fichar')")

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
    id: UUID = Field(..., description="Identificador único UUID del permiso")
    descripcion: Optional[str] = Field(None, description="Texto explicativo sobre qué acción autoriza este permiso")

    model_config = ConfigDict(from_attributes=True)