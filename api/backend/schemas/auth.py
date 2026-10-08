from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

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

    model_config = ConfigDict(from_attributes=True)

class PasswordRecuperacionRequest(BaseModel):
    email: Optional[EmailStr]
    telefono: Optional[str]

    model_config = ConfigDict(from_attributes=True)

class ConfirmarPasswordRecuperacionEmailRequest(BaseModel):
    """
    Esquema para validar el código de 6 dígitos recibido y establecer una nueva contraseña.
    """
    email: EmailStr = Field(..., description="Correo electrónico de la cuenta")
    codigo_verificacion: str = Field(..., min_length=6, max_length=10, description="Código de verificación de 6 dígitos recibido por correo")
    nueva_password: str = Field(..., min_length=6, max_length=255, description="Nueva contraseña del usuario")

    model_config = ConfigDict(from_attributes=True)

class ConfirmarPasswordRecuperacionTelefonoRequest(BaseModel):
    """
    Esquema para validar el código de 6 dígitos recibido y establecer una nueva contraseña.
    """
    telefono: str = Field(..., description="Número de teléfono de la cuenta")
    codigo_verificacion: str = Field(..., min_length=6, max_length=10, description="Código de verificación de 6 dígitos recibido por correo")
    nueva_password: str = Field(..., min_length=6, max_length=255, description="Nueva contraseña del usuario")

    model_config = ConfigDict(from_attributes=True)