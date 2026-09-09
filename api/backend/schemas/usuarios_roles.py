from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from schemas.empresas import EmpresaResponse
from schemas.roles import RolResponse
from schemas.usuarios import UsuarioSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - USUARIOS ROLES
# ==========================================

class UsuarioRolBase(BaseModel):
    """
    Propiedades comunes compartidas para la asignación de roles y ámbitos (RBAC)
    basadas en el modelo relacional mapeado por sqlacodegen.
    """
    usuario_id: UUID = Field(..., description="ID único UUID del usuario al que se le asigna el perfil")
    rol_id: UUID = Field(..., description="ID único UUID entero del rol asignado")

class UsuarioRolCreate(UsuarioRolBase):
    """
    Esquema utilizado para vincular a un usuario con un rol específico.
    Permite omitir la empresa para los perfiles globales de la gestoría.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa a la que limita el rol")

class UsuarioRolSimpleResponse(UsuarioRolBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia los módulos de control de permisos.
    """
    id: UUID = Field(..., description="Identificador único UUID de la asignación (gen_random_uuid)")
    empresa_id: UUID = Field(..., description="Ámbito de la empresa")

    model_config = ConfigDict(from_attributes=True)

class UsuarioRolResponse(UsuarioRolSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaResponse] = Field(None, description="Detalles de la empresa asociada")
    usuario: Optional[UsuarioSimpleResponse] = Field(None, description="Detalles del usuario asociado")
    rol: Optional[RolResponse] = Field(None, description="Detalles del rol asociado")

    model_config = ConfigDict(from_attributes=True)