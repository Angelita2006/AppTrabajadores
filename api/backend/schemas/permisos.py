import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from core.enums import AccionPermisoEnum, TipoPermisoEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - PERMISOS
# ==========================================

class PermisoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un permiso del sistema (RBAC)
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    tipo: TipoPermisoEnum = Field(..., description="Recurso o área funcional a la que aplica el permiso")
    accion: AccionPermisoEnum = Field(..., description="Operación autorizada sobre el recurso")
    descripcion: str = Field(..., max_length=255, description="Descripción del permiso")

    model_config = ConfigDict(from_attributes=True)

class PermisoCreate(PermisoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente o scripts de migración
    al dar de alta un nuevo permiso operativo en la plataforma.
    """   
    model_config = ConfigDict(from_attributes=True)

class PermisoSimpleResponse(PermisoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones
    para auditar o pintar las capacidades del usuario en la interfaz.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del permiso")

    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")

    model_config = ConfigDict(from_attributes=True)