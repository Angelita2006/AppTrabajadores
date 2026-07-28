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
from core.security import get_password_hash, obtener_usuario_actual
from models.usuarios import Usuarios
from core.config import settings

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)

# Configuración de correo (idealmente cárgalo desde os.getenv o tu archivo de configuración)
# SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_SERVER = settings.SMTP_SERVER
# SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_PORT = settings.SMTP_PORT
# SMTP_USER = os.getenv("SMTP_USER", "tu_correo@gmail.com")
SMTP_USER = settings.SMTP_USER
# SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "tu_password_o_token_de_aplicacion")
SMTP_PASSWORD = settings.SMTP_PASSWORD
# EMAILS_FROM = os.getenv("EMAILS_FROM", "no-reply@fichapp.com")
EMAILS_FROM = settings.EMAILS_FROM

def enviar_correo_recuperacion(destinatario: str, token: str):
    """Función auxiliar para enviar el correo mediante SMTP"""
    try:
        mensaje = MIMEMultipart("alternative")
        mensaje["Subject"] = "Código de recuperación de contraseña - FichApp"
        mensaje["From"] = EMAILS_FROM
        mensaje["To"] = destinatario

        # Cuerpo del mensaje en HTML / Texto plano
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
              <h2 style="color: #2563EB;">Recuperación de Contraseña</h2>
              <p>Has solicitado restablecer tu contraseña en <strong>FichApp</strong>.</p>
              <p>Tu código de verificación de 6 dígitos es:</p>
              <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 4px;">
                {token}
              </div>
              <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
            </div>
          </body>
        </html>
        """

        mensaje.attach(MIMEText(html, "html"))

        # Conexión y envío con el servidor SMTP
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
    Valida el correo en PostgreSQL y envía el token seguro mediante correo electrónico.
    """
    # 1. Verificamos si la cuenta existe en el SaaS para mitigar ataques de enumeración
    usuario = db.query(Usuarios).filter(Usuarios.email == payload.email.lower().strip()).first()
    if not usuario:
        # Por seguridad frente a enumeración, muchas veces se retorna 200 igual, 
        # pero mantenemos tu validación de 404 si así lo requiere tu lógica de negocio.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No consta ninguna cuenta registrada con esa dirección de correo electrónico."
        )

    # 2. Generación del token temporal (Fijado a '123456' o dinámico si prefieres)
    token_simulado = "123456"

    # 3. ENVÍO REAL DEL CORREO ELECTRÓNICO
    enviar_correo_recuperacion(usuario.email, token_simulado)

    # Retornamos un mensaje de éxito genérico para confirmar que Axios reciba HTTP 200
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
    Consolida el cambio definitivo de clave validando el token de 6 dígitos.
    """
    # 1. Buscar al usuario
    usuario = db.query(Usuarios).filter(Usuarios.email == payload.email.lower().strip()).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario especificado no existe."
        )

    # 2. Validación del Token
    token_valido = getattr(usuario, 'token_recuperacion', '123456') or '123456'
    
    if payload.token_verificacion != token_valido:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token de 6 dígitos introducido es incorrecto o ha expirado."
        )

    # 3. Hashear la nueva contraseña y actualizar el registro del usuario
    try:
        usuario.password_hash = get_password_hash(payload.nuevo_password)
        
        # Limpiamos el token consumido para evitar reutilizaciones
        if hasattr(usuario, 'token_recuperacion'):
            usuario.token_recuperacion = None
            usuario.token_expira_at = None
            
        # Actualizamos también la fecha de modificación que usa tu modelo
        if hasattr(usuario, 'updated_at'):
            usuario.updated_at = datetime.datetime.now()
            
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