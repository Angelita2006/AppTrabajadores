from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - USUARIOS ROLES
# ==========================================

class UsuarioRolBase(BaseModel):
    """
    Propiedades comunes compartidas para la asignación de roles y ámbitos (RBAC)
    basadas en el modelo relacional mapeado por sqlacodegen.
    """
    usuario_id: UUID = Field(..., description="ID único UUID del usuario al que se le asigna el perfil")
    role_id: UUID = Field(..., description="ID único UUID entero del rol asignado")

class UsuarioRolCreate(UsuarioRolBase):
    """
    Esquema utilizado para vincular a un usuario con un rol específico.
    Permite omitir la empresa para los perfiles globales de la gestoría.
    """
    empresa_id: Optional[UUID] = Field(
        None, 
        description="ID único UUID de la empresa a la que limita el rol, o NULL si aplica a todo el sistema"
    )

class UsuarioRolResponse(UsuarioRolBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia los módulos de control de permisos.
    """
    id: UUID = Field(..., description="Identificador único UUID de la asignación (gen_random_uuid)")
    empresa_id: Optional[UUID] = Field(None, description="Ámbito de la empresa si aplica")

    model_config = ConfigDict(from_attributes=True)