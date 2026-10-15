from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator, field_validator

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - AUTHENTICATION
# ==========================================

class LoginRequest(BaseModel):
    """
    Esquema simplificado utilizado exclusivamente para validar las credenciales
    recibidas en las peticiones de inicio de sesión de la API.
    """
    email: Optional[EmailStr] = Field(None, description="Correo electrónico de la cuenta")
    telefono: Optional[str] = Field(None, description="Número de teléfono de la cuenta")
    password: str = Field(..., description="Contraseña de acceso")

    @model_validator(mode='after')
    def validar_al_menos_un_identificador(self) -> 'LoginRequest':
        """
        Valida que se proporcione obligatoriamente un correo o un teléfono para el login.
        """
        if not self.email and not self.telefono:
            raise ValueError("Debes proporcionar obligatoriamente el correo electrónico o el número de teléfono para iniciar sesión.")
        return self

    model_config = ConfigDict(from_attributes=True)

class EmailCambioRequest(BaseModel):
    email_nuevo: EmailStr

    model_config = ConfigDict(from_attributes=True)

class ConfirmarCambioEmail(BaseModel):
    token: str = Field(..., description="Token de confirmación enviado al nuevo correo electrónico.")
    
    model_config = ConfigDict(from_attributes=True)

class TelefonoCambioRequest(BaseModel):
    telefono_nuevo: str

    model_config = ConfigDict(from_attributes=True)

class ConfirmarCambioTelefono(BaseModel):
    codigo: str = Field(..., min_length=6, max_length=6, description="Código de verificación de 6 dígitos enviado por SMS al nuevo teléfono.")
    
    model_config = ConfigDict(from_attributes=True)

class PasswordCambioRequest(BaseModel):
    antigua_password: str = Field(..., min_length=6, max_length=255, description="Contraseña actual del usuario")
    nueva_password: str = Field(..., min_length=6, max_length=255, description="Nueva contraseña del usuario")

    @field_validator("nueva_password")
    @classmethod
    def validar_limite_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password exceeds bcrypt 72-byte limit.")
        return value

    model_config = ConfigDict(from_attributes=True)

class PasswordRecuperacionRequest(BaseModel):
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None

    @model_validator(mode="after")
    def validar_medio_unico(self):
        if bool(self.email) == bool(self.telefono):
            raise ValueError("Proporciona solo un correo o un teléfono.")
        return self

    model_config = ConfigDict(from_attributes=True)

class ConfirmarPasswordRecuperacionRequest(BaseModel):
    """
    Esquema para validar el código de 6 dígitos recibido y establecer una nueva contraseña.
    """
    email: Optional[EmailStr] = Field(None, description="Correo electrónico de la cuenta")
    telefono: Optional[str] = Field(None, description="Número de teléfono de la cuenta")
    codigo_verificacion: str = Field(..., min_length=6, max_length=10, description="Código de verificación de 6 dígitos recibido por correo")
    nueva_password: str = Field(..., min_length=6, max_length=255, description="Nueva contraseña del usuario")

    @field_validator("nueva_password")
    @classmethod
    def validar_limite_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password exceeds bcrypt 72-byte limit.")
        return value

    model_config = ConfigDict(from_attributes=True)
