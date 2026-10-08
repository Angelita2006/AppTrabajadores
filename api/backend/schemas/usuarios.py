import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - USUARIOS
# ==========================================

class UsuarioBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un usuario
    basada en el modelo relacional mapeado por sqlacodegen.
    """
    id: Optional[UUID] = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del usuario")

    nombre: str = Field(..., max_length=150, description="Nombre completo del usuario")

    email: EmailStr = Field(..., max_length=30, description="Correo electrónico único de acceso")
    telefono: str = Field(..., max_length=30, description="Número de teléfono único de acceso")

    activo: Optional[bool] = Field(None, description="Indica si el usuario está activo o no")

    model_config = ConfigDict(from_attributes=True)

class UsuarioCreate(UsuarioBase):
    """
    Esquema utilizado para recibir los datos durante la creación de una cuenta.
    Exige la contraseña y permite vincular de forma opcional la empresa o el trabajador.
    """
    model_config = ConfigDict(from_attributes=True)

class UsuarioRegisterCreate(UsuarioBase):
    """
    Esquema utilizado para validar los datos enviados desde la app móvil
    al registrar un nuevo usuario vinculándolo a un trabajador existente.
    """
    model_config = ConfigDict(from_attributes=True)

class UsuarioSimpleResponse(UsuarioBase):
    """
    Esquema utilizado para empaquetar los datos del perfil que se envían al cliente.
    Excluye por completo el hash de la contraseña para evitar brechas de seguridad.
    """
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de creación de la cuenta (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación (now)")
    ultimo_acceso: Optional[datetime.datetime] = Field(None, description="Último inicio de sesión registrado en el servidor")

    codigo_recuperacion: Optional[str] = Field(None, description='Código de recuperación para restablecimiento de contraseña')
    codigo_expira_at: Optional[datetime.datetime] = Field(None, description='Fecha de expiración del código de recuperación')

    email_pendiente_verificacion: Optional[str] = Field(None, description='Dirección de correo electrónico pendiente de verificación')
    token_cambio_email: Optional[str] = Field(None, description='Token para cambiar la dirección de correo electrónico')
    token_cambio_email_expira_at: Optional[str] = Field(None, description='Fecha de expiracion del token para cambiar el correo electrónico')

    telefono_pendiente_verificacion: Optional[str] = Field(None, description='Número de teléfono pendiente de verificación')
    token_cambio_telefono: Optional[str] = Field(None, description='Token para cambiar el número de teléfono')
    token_cambio_telefono_expira_at: Optional[str] = Field(None, description='Fecha de expiración del token para cambiar el número de teléfono')

    model_config = ConfigDict(from_attributes=True)


