import datetime
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from schemas.auth import ConfirmarPasswordRequest, EmailRecuperacionRequest
from core.database import get_db
from core.security import get_password_hash
from models.usuarios import Usuarios
from core.config import settings
import random
from datetime import timedelta, timezone

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)

# Configuración de correo
SMTP_SERVER = settings.SMTP_SERVER
SMTP_PORT = settings.SMTP_PORT
SMTP_USER = settings.SMTP_USER
SMTP_PASSWORD = settings.SMTP_PASSWORD
EMAILS_FROM = settings.EMAILS_FROM

def enviar_correo_recuperacion(destinatario: str, codigo: str):
    """Función auxiliar para enviar el correo mediante SMTP"""
    try:
        mensaje = MIMEMultipart("alternative")
        mensaje.add_header("Subject", "Código de recuperación de contraseña - FichApp")
        mensaje["From"] = EMAILS_FROM
        mensaje["To"] = destinatario

        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
              <h2 style="color: #2563EB;">Recuperación de Contraseña</h2>
              <p>Has solicitado restablecer tu contraseña en <strong>Fichapp</strong>.</p>
              <p>Tu código de verificación de 6 dígitos es:</p>
              <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 4px;">
                {codigo}
              </div>
              <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
            </div>
          </body>
        </html>
        """

        mensaje.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as servidor:
            servidor.starttls()
            servidor.login(SMTP_USER, SMTP_PASSWORD)
            servidor.sendmail(SMTP_USER, destinatario, mensaje.as_string())
            
    except Exception as e:
        print(f"Error al enviar el correo SMTP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo enviar el correo electrónico de recuperación. Inténtalo más tarde."
        )

@router.post("/recuperar-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
def solicitar_recuperacion_password(
    request: Request,
    payload: EmailRecuperacionRequest, 
    db: Session = Depends(get_db),
):
    """
    URI: POST /api/auth/recuperar-password
    Valida el correo en PostgreSQL, genera un código aleatorio de 6 dígitos y lo guarda en la BD.
    """
    usuario = db.query(Usuarios).filter(Usuarios.email == payload.email.lower().strip()).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No consta ninguna cuenta registrada con esa dirección de correo electrónico."
        )

    # 1. Generación del código aleatorio real de 6 dígitos
    codigo_aleatorio = f"{random.randint(0, 999999):06d}"

    # 2. Guardar el código y su expiración (15 minutos con zona horaria UTC)
    try:
        usuario.codigo_recuperacion = codigo_aleatorio
        usuario.codigo_expira_at = datetime.datetime.now(timezone.utc) + timedelta(minutes=15)

        db.add(usuario)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al procesar la solicitud de recuperación."
        )

    # 3. Envío real del correo electrónico
    enviar_correo_recuperacion(usuario.email, codigo_aleatorio)

    return {
        "status": "success",
        "message": "Se ha enviado un código de verificación a tu correo electrónico."
    }

@router.post("/confirmar-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
def confirmar_password(
    request: Request,
    payload: ConfirmarPasswordRequest, 
    db: Session = Depends(get_db),
):
    """
    URI: POST /api/auth/confirmar-password
    Valida el código de recuperación persistido en la BD y actualiza la contraseña.
    """
    usuario = db.query(Usuarios).filter(Usuarios.email == payload.email.lower().strip()).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario especificado no existe."
        )

    # 1. Validación estricta del código registrado
    if not usuario.codigo_recuperacion or payload.codigo_verificacion != usuario.codigo_recuperacion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de verificación introducido es incorrecto."
        )

    # 2. Validar si el código ha expirado (comparando ambos con zona horaria UTC)
    if usuario.codigo_expira_at and datetime.datetime.now(timezone.utc) > usuario.codigo_expira_at:
        usuario.codigo_recuperacion = None
        usuario.codigo_expira_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de verificación ha expirado. Solicita uno nuevo."
        )

    # 3. Hashear la nueva contraseña y actualizar el registro del usuario
    try:
        usuario.password_hash = get_password_hash(payload.nueva_password)
        
        # Limpiamos los campos de recuperación consumidos
        usuario.codigo_recuperacion = None
        usuario.codigo_expira_at = None
            
        # Actualizamos la fecha de modificación con UTC
        if hasattr(usuario, 'updated_at'):
            usuario.updated_at = datetime.datetime.now(timezone.utc)
            
        db.add(usuario) 
        db.commit()
        
        return {
            "status": "success",
            "message": "Tu contraseña ha sido actualizada correctamente."
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al actualizar la contraseña: {str(e)}"
        )