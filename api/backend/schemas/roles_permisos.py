import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import  Optional
from uuid import UUID
from schemas.roles import RolSimpleResponse
from schemas.permisos import PermisoSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - RELACIÓN ENTRE ROLES Y PERMISOS
# ==========================================

class RolPermisoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una relación entre rol y permiso del sistema (RBAC)
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    id: Optional[UUID] = Field(..., description="ID único UUID autogenerado (gen_random_uuid) de la relación rol-permiso")
    rol_id: UUID = Field(..., description="ID único UUID del rol asociado")
    permiso_id: UUID = Field(..., description="ID único UUID del permiso asociado")

    model_config = ConfigDict(from_attributes=True)

class RolPermisoCreate(RolPermisoBase):
    """
    Esquema utilizado para recibir los datos al registrar un nuevo rol en la plataforma.
    """
    pass

class RolPermisoUpdate(RolPermisoBase):
    """
    Esquema para la actualización parcial o total de los datos de un rol.
    """
    nombre: Optional[str] = Field(None, min_length=2, max_length=100, description="Nombre único del rol")
    descripcion: Optional[str] = Field(None, max_length=255, description="Explicación detallada de las funciones de este rol")

    model_config = ConfigDict(from_attributes=True)

class RolPermisoSimpleResponse(RolPermisoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones
    para mapear los perfiles de usuario.
    """
    created_at: datetime.datetime = Field(..., description="Fecha y hora de inserción real calculada por el servidor (now)")
    updated_at: datetime.datetime = Field(..., description="Fecha y hora de la última modificación efectuada (now)")

    model_config = ConfigDict(from_attributes=True)

class RolPermisoResponse(RolPermisoSimpleResponse):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones
    para mapear los perfiles de usuario.
    """
    rol: Optional[RolSimpleResponse] = Field(None, description="Detalles del rol asociado")
    permiso: Optional[PermisoSimpleResponse] = Field(None, description="Detalles del permiso asociado")

    model_config = ConfigDict(from_attributes=True)