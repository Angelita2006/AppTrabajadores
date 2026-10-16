import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
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
    nombre: str = Field(..., max_length=150, description="Nombre completo del usuario")

    email: EmailStr = Field(..., max_length=150, description="Correo electrónico único de acceso")
    telefono: Optional[str] = Field(None, max_length=30, description="Número de teléfono único de acceso")
    foto_url: Optional[str] = Field(None, description="Ruta privada del avatar de la cuenta")

    activo: Optional[bool] = Field(True, description="Indica si el usuario está activo o no")

    model_config = ConfigDict(from_attributes=True)

class UsuarioCreate(UsuarioBase):
    """
    Esquema utilizado para recibir los datos durante la creación de una cuenta.
    Exige la contraseña y permite vincular de forma opcional la empresa o el trabajador.
    """
    password: str = Field(..., description="Contraseña única de acceso")

    @field_validator("password")
    @classmethod
    def validar_longitud_password_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("La contrasena no puede superar 72 bytes.")
        return value

    model_config = ConfigDict(from_attributes=True)

class UsuarioUpdate(BaseModel):
    """
    Esquema utilizado para recibir los datos durante la creación de una cuenta.
    Exige la contraseña y permite vincular de forma opcional la empresa o el trabajador.
    """
    nombre: Optional[str] = Field(None, max_length=150, description="Nombre completo del usuario")

    email: Optional[EmailStr] = Field(None, max_length=150, description="Correo electrónico único de acceso")
    telefono: Optional[str] = Field(None, max_length=30, description="Número de teléfono único de acceso")

    activo: Optional[bool] = Field(True, description="Indica si el usuario está activo o no")

    password: Optional[str] = Field(None, description="Contraseña única de acceso")
    
    @field_validator("password")
    @classmethod
    def validar_longitud_password_bcrypt(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and len(value.encode("utf-8")) > 72:
            raise ValueError("La contrasena no puede superar 72 bytes.")
        return value

    model_config = ConfigDict(from_attributes=True)

class UsuarioSimpleResponse(UsuarioBase):
    """
    Esquema utilizado para empaquetar los datos del perfil que se envían al cliente.
    Excluye por completo el hash de la contraseña para evitar brechas de seguridad.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del usuario")

    created_at: datetime.datetime = Field(..., description="Marca de tiempo de creación de la cuenta (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación (now)")
    ultimo_acceso: Optional[datetime.datetime] = Field(None, description="Último inicio de sesión registrado en el servidor")

    model_config = ConfigDict(from_attributes=True)


