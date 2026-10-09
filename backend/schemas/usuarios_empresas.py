import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from schemas.empresas import EmpresaSimpleResponse
from schemas.roles import RolSimpleResponse
from schemas.usuarios import UsuarioSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - RELACIÓN ENTRE USUARIOS Y EMPRESAS
# ==========================================

class UsuarioEmpresaBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un turno teórico
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    activo: Optional[bool] = Field(True, description="Indica si la relación usuario-empresa está activa o no")

    model_config = ConfigDict(from_attributes=True)

class UsuarioEmpresaCreate(UsuarioEmpresaBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al configurar un nuevo turno.
    """
    usuario_id: UUID = Field(..., description="ID único UUID del usuario asociado")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa asociada")
    rol_id: UUID = Field(..., description="ID único UUID del rol asociado")

    model_config = ConfigDict(from_attributes=True)

class UsuarioEmpresaUpdate(BaseModel):
    """
    Esquema para actualizar datos de un turno.
    """
    rol_id: Optional[UUID] = Field(None, description="ID único UUID del rol asociado")

    activo: Optional[bool] = Field(True, description="Indica si la relación usuario-empresa está activa o no")

    model_config = ConfigDict(from_attributes=True)

class UsuarioEmpresaSimpleResponse(UsuarioEmpresaBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía a las aplicaciones.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) de la relación usuario-empresa")
    usuario_id: UUID = Field(..., description="ID único UUID del usuario asociado")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa asociada")
    rol_id: UUID = Field(..., description="ID único UUID del rol asociado")

    created_at: datetime.datetime = Field(..., description="Marca de tiempo de la creación del cuadrante (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")

    model_config = ConfigDict(from_attributes=True)

class UsuarioEmpresaResponse(UsuarioEmpresaSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    usuario: Optional[UsuarioSimpleResponse] = Field(None, description="Detalles del usuario asociado")
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    rol: Optional[RolSimpleResponse] = Field(None, description="Detalles del rol asociado")

    model_config = ConfigDict(from_attributes=True)