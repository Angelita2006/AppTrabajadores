from pydantic import BaseModel, EmailStr, Field

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class EmailRecuperacionRequest(BaseModel):
    email: EmailStr

class ConfirmarPasswordRequest(BaseModel):
    """
    Esquema para validar el código de 6 dígitos recibido y establecer una nueva contraseña.
    """
    email: EmailStr = Field(..., description="Correo electrónico de la cuenta")
    codigo_verificacion: str = Field(..., min_length=6, max_length=10, description="Código de verificación de 6 dígitos recibido por correo")
    nueva_password: str = Field(..., min_length=6, max_length=255, description="Nueva contraseña")