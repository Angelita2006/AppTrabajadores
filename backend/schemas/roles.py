import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from schemas.empresas import EmpresaSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - ROLES
# ==========================================

class RolBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un rol del sistema (RBAC)
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    nombre: str = Field(..., max_length=50, description="Nombre único del rol (Ej: 'admin_empresa', 'trabajador')")
    descripcion: Optional[str] = Field(None, max_length=255, description="Explicación detallada de las funciones de este rol")

    model_config = ConfigDict(from_attributes=True)

class RolCreate(RolBase):
    """
    Esquema utilizado para recibir los datos al registrar un nuevo rol en la plataforma.
    """
    empresa_id: Optional[UUID] = Field(..., description="ID único UUID de la empresa; NULL para rol de sistema; con valor es un rol personalizado de esa empresa")

    model_config = ConfigDict(from_attributes=True)

class RolUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de los datos de un rol.
    """
    nombre: Optional[str] = Field(None, max_length=50, description="Nombre único del rol (Ej: 'admin_empresa', 'trabajador')")
    descripcion: Optional[str] = Field(None, max_length=255, description="Explicación detallada de las funciones de este rol")

    model_config = ConfigDict(from_attributes=True)

class RolSimpleResponse(RolBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones
    para mapear los perfiles de usuario.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del rol")
    empresa_id: Optional[UUID] = Field(..., description="ID único UUID de la empresa; NULL para rol de sistema; con valor es un rol personalizado de esa empresa")

    created_at: datetime.datetime = Field(..., description="Fecha y hora de inserción real calculada por el servidor (now)")
    updated_at: datetime.datetime = Field(..., description="Fecha y hora de la última modificación efectuada (now)")

    model_config = ConfigDict(from_attributes=True)

class RolResponse(RolSimpleResponse):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones
    para mapear los perfiles de usuario.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    
    model_config = ConfigDict(from_attributes=True)