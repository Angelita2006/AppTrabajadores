import datetime
import random
from datetime import timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from core.auditoria import registrar_auditoria
from core.database import get_db
from core.enums import AccionAuditoriaEnum
from core.security import get_password_hash
from core.utils import enviar_correo_recuperacion_contraseña, enviar_sms_recuperacion_contraseña
from models.usuarios import Usuarios
from schemas.auth import (
    ConfirmarPasswordRecuperacionRequest,
    PasswordRecuperacionRequest,
)

# APIRouter agrupa todos los endpoints relacionados con la autenticación bajo el prefijo "/api/auth".
router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.post(
    "/recuperar-password",
    status_code=status.HTTP_200_OK,
    summary="Solicitar recuperación de contraseña",
)
@limiter.limit("5/minute")
def solicitar_recuperacion_password(
    request: Request,
    payload: PasswordRecuperacionRequest,
    db: Session = Depends(get_db),
):
    """
    **POST /api/auth/recuperar-password**

    Valida el correo, genera un código aleatorio de 6 dígitos y lo envía por correo o por teléfono.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de recuperación de contraseña para el correo ({payload.email}) desde la IP ({cliente_ip}).")

    # Validaciones estructurales básicas
    medio = None
    usuario = None
    if payload.email:
        medio = "email"
        usuario = db.query(Usuarios).filter(
            Usuarios.email == payload.email.strip(),
            Usuarios.activo.is_(True),
        ).first()
        if not usuario:
            print(f"Intento de recuperación fallido: El correo ({payload.email}) no está registrado en el sistema.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No consta ninguna cuenta registrada con esa dirección de correo electrónico."
            )
    elif payload.telefono:
        medio = "telefono"
        usuario = db.query(Usuarios).filter(
            Usuarios.telefono == payload.telefono.strip(),
            Usuarios.activo.is_(True),
        ).first()
        if not usuario:
            print(f"Intento de recuperación fallido: El teléfono ({payload.telefono}) no está registrado en el sistema.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No consta ninguna cuenta registrada con esa número de teléfono."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se ha proporcionado ningún medio de recuperación."
        )

    if not usuario:
        print("No se ha podido encontrar un usuario para recuperar su contraseña.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se ha podido encontrar un usuario para recuperar su contraseña."
        )

    # Generación del código aleatorio real de 6 dígitos
    codigo_aleatorio = f"{random.randint(0, 999999):06d}"

    # Guardar el código y su expiración (15 minutos con zona horaria UTC)
    try:
        usuario.codigo_recuperacion = codigo_aleatorio
        usuario.codigo_expira_at = datetime.datetime.now(timezone.utc) + timedelta(minutes=15)

        db.add(usuario)
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario.id,
            empresa_id=None,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "usuario", "accion": "solicitar_recuperacion_password"},
            trabajador_id=None
        )

        print(f"Código de recuperación generado para el usuario ({usuario.id}).")

        # Envío del código generado
        if medio == "email":
            enviar_correo_recuperacion_contraseña(usuario.email, codigo_aleatorio)
            return {"detail": f"Se ha enviado un código a tu dirección de correo electrónico."}
        elif medio == "telefono":
            enviar_sms_recuperacion_contraseña(usuario.telefono.__str__().replace("-", ""), codigo_aleatorio)
            return {"detail": f"Se ha enviado un código a tu número de teléfono."}
    except Exception as e:
        db.rollback()
        print(f"No se ha podido guardar el código de recuperación: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido procesar la solicitud de recuperación de contraseña."
        )

@router.post(
    "/confirmar-password",
    status_code=status.HTTP_200_OK,
    summary="Confirmar nueva contraseña",
)
@limiter.limit("5/minute")
def confirmar_password(
    request: Request,
    payload: ConfirmarPasswordRecuperacionRequest,
    db: Session = Depends(get_db),
):
    """
    **POST /api/auth/confirmar-password**

    Valida el código de recuperación enviado y actualiza la contraseña.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de confirmación de nueva contraseña para el correo '{payload.email}' desde la IP: {cliente_ip}")

    # Validaciones estructurales básicas
    usuario = None
    if payload.email:
        usuario = db.query(Usuarios).filter(
            Usuarios.email == payload.email.strip(),
            Usuarios.activo.is_(True),
        ).first()
        if not usuario:
            print(f"Intento de recuperación fallido: El correo ({payload.email}) no está registrado en el sistema.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No consta ninguna cuenta registrada con esa dirección de correo electrónico."
            )
    elif payload.telefono:
        usuario = db.query(Usuarios).filter(
            Usuarios.telefono == payload.telefono.strip(),
            Usuarios.activo.is_(True),
        ).first()
        if not usuario:
            print(f"Intento de recuperación fallido: El teléfono ({payload.telefono}) no está registrado en el sistema.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No consta ninguna cuenta registrada con esa número de teléfono."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se ha proporcionado ningún medio de recuperación."
        )

    if not usuario:
        print("No se ha podido encontrar un usuario para recuperar su contraseña.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se ha podido encontrar un usuario para recuperar su contraseña."
        )

    if not usuario.codigo_recuperacion or payload.codigo_verificacion != usuario.codigo_recuperacion:
        print(f"Código de verificación inválido o ausente para el usuario ({usuario.id}).")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de verificación introducido no está o es incorrecto."
        )

    if usuario.codigo_expira_at and datetime.datetime.now(timezone.utc) > usuario.codigo_expira_at:
        print(f"El código de recuperación ha expirado para el usuario ({usuario.id}).")
        usuario.codigo_recuperacion = None
        usuario.codigo_expira_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de verificación ha expirado. Solicita uno nuevo."
        )

    # Hashear la nueva contraseña y actualizar el registro del usuario
    try:
        usuario.password_hash = get_password_hash(payload.nueva_password)

        # Limpiamos los campos de recuperación consumidos
        usuario.codigo_recuperacion = None
        usuario.codigo_expira_at = None

        # Actualizamos la fecha de modificación
        if hasattr(usuario, 'updated_at'):
            usuario.updated_at = datetime.datetime.now(timezone.utc)

        db.add(usuario)
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario.id,
            empresa_id=None,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "usuario", "accion": "confirmar_recuperacion_password"},
            trabajador_id=None
        )

        print(f"Contraseña actualizada exitosamente para el usuario ({usuario.id}).")
        return {"detail": "Tu contraseña ha sido actualizada correctamente."}
    except Exception as e:
        db.rollback()
        print(f"No se ha podido actualizar la contraseña del usuario ({usuario.id}): {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido actualizar la contraseña."
        )
