from pydantic import BaseModel, EmailStr

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class EmailRecuperacionRequest(BaseModel):
    email: EmailStr

class ConfirmarPasswordRequest(BaseModel):
    email: EmailStr
    token_verificacion: str
    nuevo_password: str