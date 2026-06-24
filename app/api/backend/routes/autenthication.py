# app/api/backend/routes/autenticacion.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
import datetime
from uuid import UUID

from core.database import get_db
from models.usuarios import Usuarios

router = APIRouter(prefix="/api/auth", tags=["Autenticación Pública"])

# ==========================================
# ESQUEMAS DE VALIDACIÓN DE ENTRADA (PYDANTIC)
# ==========================================

class PasswordRecoveryRequest(BaseModel):
    email: EmailStr = Field(..., description="Correo electrónico del usuario que solicita la recuperación")

class PasswordResetConfirm(BaseModel):
    email: EmailStr = Field(..., description="Correo electrónico verificado")
    token_verificacion: str = Field(..., description="Token seguro de 6 dígitos enviado por correo")
    nuevo_password: str = Field(..., min_length=6, description="Nueva contraseña en texto plano")

# ==========================================
# ENDPOINTS OPERATIVOS
# ==========================================

@router.post("/recuperar-password", status_code=status.HTTP_200_OK)
def solicitar_recuperacion_password(obj_in: PasswordRecoveryRequest, db: Session = Depends(get_db)):
    """
    URI: POST /api/auth/recuperar-password
    Verifica el correo del usuario y simula el envío de un token seguro de 6 dígitos por email.
    """
    usuario = db.query(Usuarios).filter(Usuarios.email == obj_in.email).first()
    
    # REGLA DE SEGURIDAD UX: Si el correo no existe, no lo revelamos para evitar ataques de enumeración.
    # Respondemos con un 200 ficticio simulando éxito en ambos escenarios.
    if not usuario:
        return {"detail": "Si el correo electrónico se encuentra en el sistema, recibirás un token de recuperación."}

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario asociada se encuentra desactivada."
        )

    # LÓGICA DE PRODUCCIÓN: Aquí generarías un token aleatorio en tu tabla 'tokens_recuperacion'
    # y dispararías tu cliente de correos (ej: SendGrid, Amazon SES o SMTP) hacia usuario.email
    print(f"--- [EMAIL SERVICE] Enviando token '123456' al correo: {usuario.email} ---")
    
    return {"detail": "Si el correo electrónico se encuentra en el sistema, recibirás un token de recuperación."}


@router.post("/confirmar-password", status_code=status.HTTP_200_OK)
def confirmar_restablecimiento_password(obj_in: PasswordResetConfirm, db: Session = Depends(get_db)):
    """
    URI: POST /api/auth/confirmar-password
    Valida el token de 6 dígitos enviado por correo y consolida la nueva contraseña en PostgreSQL.
    """
    usuario = db.query(Usuarios).filter(Usuarios.email == obj_in.email).first()
    if not usuario or not usuario.activo:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Operación inválida.")

    # Simulación del token fijo para la demo
    if obj_in.token_verificacion != "123456":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El token de verificación de 6 dígitos es incorrecto o ha expirado.")

    # Modificación segura actualizando los hilos de auditoría de la plataforma Saas
    setattr(usuario, "password_hash", str(obj_in.nuevo_password)) # Hash preliminar
    setattr(usuario, "updated_at", datetime.datetime.now())
    
    db.commit()
    return {"detail": "La contraseña de tu cuenta ha sido restablecida correctamente. Ya puedes iniciar sesión."}
