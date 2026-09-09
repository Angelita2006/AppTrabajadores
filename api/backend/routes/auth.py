import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.utils import enviar_correo_recuperacion
from schemas.auth import ConfirmarPasswordRequest, EmailRecuperacionRequest
from core.database import get_db
from core.security import get_password_hash
from models.usuarios import Usuarios
import random
from datetime import timedelta, timezone

# APIRouter agrupa todos los endpoints relacionados con la autenticación bajo el prefijo "/api/auth".
router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.post("/recuperar-password", status_code=status.HTTP_200_OK, summary="Solicitar recuperación de contraseña")
@limiter.limit("5/minute")  # Limita este endpoint a un máximo de 5 peticiones por minuto por IP para prevenir abuso
def solicitar_recuperacion_password(
    request: Request,
    payload: EmailRecuperacionRequest, 
    db: Session = Depends(get_db),
):
    """
    **POST /api/auth/recuperar-password**
    
    Valida el correo en PostgreSQL, genera un código aleatorio de 6 dígitos y lo guarda en la BD.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de recuperación de contraseña para el correo '{payload.email}' desde la IP: {cliente_ip}")

    usuario = db.query(Usuarios).filter(Usuarios.email == payload.email.lower().strip()).first()
    if not usuario:
        print(f"Intento de recuperación fallido: El correo '{payload.email}' no está registrado en el sistema.")
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
        print(f"Código de recuperación generado y persistido para el usuario ID: {usuario.id}")
    except Exception as e:
        db.rollback()
        print(f"Error en base de datos al guardar código de recuperación para '{payload.email}': {str(e)}")
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

@router.post("/confirmar-password", status_code=status.HTTP_200_OK, summary="Confirmar nueva contraseña")
@limiter.limit("5/minute")  # Limita este endpoint a un máximo de 5 peticiones por minuto por IP
def confirmar_password(
    request: Request,
    payload: ConfirmarPasswordRequest, 
    db: Session = Depends(get_db),
):
    """
    **POST /api/auth/confirmar-password**
    
    Valida el código de recuperación persistido en la BD y actualiza la contraseña.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de confirmación de nueva contraseña para el correo '{payload.email}' desde la IP: {cliente_ip}")

    usuario = db.query(Usuarios).filter(Usuarios.email == payload.email.lower().strip()).first()
    if not usuario:
        print(f"Intento de confirmación fallido: Usuario con correo '{payload.email}' no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario especificado no existe."
        )

    # 1. Validación estricta del código registrado
    if not usuario.codigo_recuperacion or payload.codigo_verificacion != usuario.codigo_recuperacion:
        print(f"Código de verificación inválido o ausente para el usuario ID: {usuario.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de verificación introducido es incorrecto."
        )

    # 2. Validar si el código ha expirado (comparando ambos con zona horaria UTC)
    if usuario.codigo_expira_at and datetime.datetime.now(timezone.utc) > usuario.codigo_expira_at:
        print(f"El código de recuperación ha expirado para el usuario ID: {usuario.id}")
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
        print(f"Contraseña actualizada exitosamente para el usuario ID: {usuario.id}")
        
        return {
            "status": "success",
            "message": "Tu contraseña ha sido actualizada correctamente."
        }

    except Exception as e:
        db.rollback()
        print(f"Error interno al actualizar la contraseña del usuario ID {usuario.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al actualizar la contraseña: {str(e)}"
        )