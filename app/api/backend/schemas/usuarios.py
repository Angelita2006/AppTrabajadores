import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from enums import TipoUsuarioEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class UsuarioBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un usuario
    basada en el modelo relacional mapeado por sqlacodegen.
    """
    nombre: str = Field(..., max_length=150, description="Nombre identificativo de la cuenta")
    email: EmailStr = Field(..., max_length=255, description="Correo electrónico único de acceso")
    tipo_usuario: TipoUsuarioEnum = Field(..., description="Categoría de usuario (admin_gestoria, admin_empresa, trabajador, etc.)")


class UsuarioCreate(UsuarioBase):
    """
    Esquema utilizado para recibir los datos durante la creación de una cuenta.
    Exige la contraseña y permite vincular de forma opcional la empresa o el trabajador.
    """
    password_raw: str = Field(..., min_length=6, max_length=255, description="Contraseña en texto plano antes del hash")
    
    # NULL para usuarios globales de la gestoría según diseño de base de datos
    empresa_id: Optional[UUID] = Field(None, description="ID único UUID de la empresa cliente asignada")
    trabajador_id: Optional[UUID] = Field(None, description="ID único UUID del expediente de trabajador vinculado")


class UsuarioResponse(UsuarioBase):
    """
    Esquema utilizado para empaquetar los datos del perfil que se envían al cliente.
    Excluye por completo el hash de la contraseña para evitar brechas de seguridad.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    mfa_habilitado: bool = Field(..., description="Determina si tiene activa la autenticación de doble factor")
    activo: bool = Field(..., description="Determina si el usuario tiene permitido el acceso a la plataforma")
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de creación de la cuenta (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación (now)")
    
    # Propiedades complementarias opcionales expuestas en el JSON
    empresa_id: Optional[UUID] = Field(None)
    trabajador_id: Optional[UUID] = Field(None)
    ultimo_acceso: Optional[datetime.datetime] = Field(None, description="Último inicio de sesión registrado en el servidor")

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True


class LoginRequest(BaseModel):
    """
    Esquema simplificado utilizado exclusivamente para validar las credenciales
    recibidas en las peticiones de inicio de sesión de la API.
    """
    email: EmailStr = Field(..., description="Correo electrónico de la cuenta")
    password: str = Field(..., description="Contraseña de acceso")
