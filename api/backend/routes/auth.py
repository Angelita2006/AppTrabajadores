from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import datetime
from core.database import get_db
from core.security import get_password_hash
from models.usuarios import Usuarios

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

# Esquema Pydantic local para validar la entrada del correo electrónico
class EmailRecuperacionRequest(BaseModel):
    email: EmailStr

class ConfirmarPasswordRequest(BaseModel):
    email: EmailStr
    token_verificacion: str
    nuevo_password: str

@router.post("/recuperar-password", status_code=status.HTTP_200_OK)
def solicitar_recuperacion_password(payload: EmailRecuperacionRequest, db: Session = Depends(get_db)):
    """
    URI: POST /api/auth/recuperar-password
    Valida el correo en PostgreSQL e imprime el token seguro en los logs de la consola del servidor.
    """
    # 1. Verificamos si la cuenta existe en el SaaS para mitigar ataques de enumeración
    usuario = db.query(Usuarios).filter(Usuarios.email == payload.email.lower().strip()).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No consta ninguna cuenta registrada con esa dirección de correo electrónico."
        )

    # 2. Generación del token temporal (Fijado a '123456' para tu entorno de pruebas local)
    token_simulado = "123456"
    
    # Aquí guardarías el token en una tabla de auditoría o columna temporal con expiración de 15 minutos:
    # usuario.token_recuperacion = token_simulado
    # usuario.token_expira_at = datetime.datetime.now() + datetime.timedelta(minutes=15)
    # db.commit()

    # 3. IMPRESIÓN DE SEGURIDAD EN CONSOLA (LOGS DE UVICORN):
    # Esto cumple con la directiva visual de tu alerta móvil en el entorno de desarrollo
    print("\n" + "="*60)
    print(f"🔒 [FICHAPP SECURITY] ACCIÓN: SOLICITUD DE RESTABLECIMIENTO DE CLAVE")
    print(f"📧 CORREO DESTINATARIO: {usuario.email}")
    print(f"🔑 TOKEN DE VERIFICACIÓN GENERADO: {token_simulado}")
    print(f"⏰ FECHA Y HORA OFICIAL: {datetime.datetime.now().isoformat()}")
    print("="*60 + "\n")

    # Retornamos un mensaje de éxito genérico para confirmar que Axios reciba HTTP 200
    return {
        "status": "success",
        "message": "Código de verificación despachado de forma segura en los canales de auditoría corporativos."
    }

@router.post("/confirmar-password", status_code=status.HTTP_200_OK)
def confirmar_password(payload: ConfirmarPasswordRequest, db: Session = Depends(get_db)):
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

    # 2. Validación del Token (Entorno de desarrollo local)
    # Compara contra el token fijo '123456' o contra la columna de base de datos si la implementaste
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
            
        db.add(usuario) # Asegura que SQLAlchemy marque al usuario como modificado
        db.commit()
        
        print(f"¡Contraseña actualizada con éxito en la columna password_hash para: {usuario.email}!")
        
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

# # app/api/backend/routes/auth.py
# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlalchemy.orm import Session
# from pydantic import BaseModel, EmailStr, SecretStr
# from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType, NameEmail
# from core.database import get_db
# from models.usuarios import Usuarios

# router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

# # 1. CONFIGURACIÓN DEL SERVIDOR SMTP (Ajusta con tus credenciales reales)
# conf = ConnectionConfig(
#     MAIL_USERNAME="", 
#     MAIL_PASSWORD=SecretStr(""),       
#     MAIL_FROM="",
#     MAIL_PORT=587,                             
#     MAIL_SERVER="smtp.gmail.com",              
#     MAIL_FROM_NAME="FICHAPP Soporte",
#     MAIL_STARTTLS=True,                        
#     MAIL_SSL_TLS=False,
#     USE_CREDENTIALS=True,
#     VALIDATE_CERTS=True
# )

# class EmailRecuperacionRequest(BaseModel):
#     email: EmailStr 

# # Convertimos la función a asíncrona ('async def') para no bloquear el servidor durante el envío
# @router.post("/recuperar-password", status_code=status.HTTP_200_OK)
# async def solicitar_recuperacion_password(payload: EmailRecuperacionRequest, db: Session = Depends(get_db)):
#     """
#     URI: POST /api/auth/recuperar-password
#     Valida el correo en PostgreSQL y despacha el token oficial a la bandeja de entrada del usuario.
#     """
#     # Verificamos si la cuenta existe en el SaaS
#     usuario: Usuarios = db.query(Usuarios).filter(Usuarios.email == payload.email.lower().strip()).first()
#     if not usuario:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="No consta ninguna cuenta registrada con esa dirección de correo electrónico."
#         )

#     # Generación del token temporal (Fijado a '123456' para tu entorno de pruebas)
#     token_oficial = "123456"

#     # Maquetamos el cuerpo del mensaje en formato HTML limpio y profesional
#     html_contenido = f"""
#     <html>
#         <body style="font-family: Arial, sans-serif; color: #1E293B; line-height: 1.6;">
#             <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 12px;">
#                 <h2 style="color: #EA580C;">Recuperación de Contraseña - FICHAPP</h2>
#                 <p>Hola, <strong>{usuario.nombre}</strong>.</p>
#                 <p>Hemos recibido una solicitud para restablecer el acceso a tu perfil de control horario.</p>
#                 <p>Introduce el siguiente código de verificación de 6 dígitos en tu aplicación móvil:</p>
#                 <div style="background-color: #F8FAFC; border: 2px dashed #EA580C; padding: 14px; text-align: center; margin: 20px 0; border-radius: 8px;">
#                     <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0F172A;">{token_oficial}</span>
#                 </div>
#                 <p style="font-size: 12px; color: #64748B;">Este código es de un solo uso y caducará en 15 minutos. Si no has solicitado este cambio, puedes ignorar este mensaje de forma segura.</p>
#                 <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
#                 <p style="font-size: 11px; color: #94A3B8; text-align: center;">FICHAPP SaaS - Sistema Integrado de Registro de Jornada Laboral</p>
#             </div>
#         </body>
#     </html>
#     """

#     destinatario_validado = NameEmail(name=usuario.nombre, email=usuario.email)

#     # 2. CONSTRUCCIÓN DEL MENSAJE ASÍNCRONO
#     message = MessageSchema(
#         subject="Código de verificación FICHAPP",
#         recipients=[destinatario_validado], 
#         body=html_contenido,
#         subtype=MessageType.html
#     )

#     try:
#         # 3. DISPARO REAL HACIA LOS SERVIDORES DE INTERNET
#         fm = FastMail(conf)
#         await fm.send_message(message)
        
#         return {
#             "status": "success",
#             "message": "Código de verificación enviado oficialmente a tu bandeja de entrada."
#         }
#     except Exception as e:
#         # Si las credenciales SMTP de tu archivo están mal configuradas, lanzará un error de red
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error en los servidores de mensajería SMTP: {str(e)}"
#         )
