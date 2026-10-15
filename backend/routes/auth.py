import datetime
import hashlib
import secrets
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
    "/confirmar-password",
    status_code=status.HTTP_200_OK,
    summary="Confirmar nueva contraseña",
    description="Valida el código de recuperación enviado y actualiza la contraseña.",
)
@limiter.limit("5/minute")
def confirmar_password(
    request: Request,
    payload: ConfirmarPasswordRecuperacionRequest,
    db: Session = Depends(get_db),
):
    """Valida un código temporal y actualiza la contraseña de la cuenta."""
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de confirmación de recuperación de contraseña desde la IP ({cliente_ip}).")

    identificador = payload.email.strip().lower() if payload.email else payload.telefono.strip() if payload.telefono else None
    if not identificador:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código no válido o caducado.")

    consulta = db.query(Usuarios).filter(Usuarios.activo.is_(True))
    consulta = consulta.filter(Usuarios.email == identificador) if payload.email else consulta.filter(Usuarios.telefono == identificador)
    usuario = consulta.with_for_update().first()
    ahora = datetime.datetime.now(timezone.utc)
    if not usuario or not usuario.codigo_recuperacion or not usuario.codigo_expira_at or ahora > usuario.codigo_expira_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código no válido o caducado.")

    codigo_proporcionado = hashlib.sha256(payload.codigo_verificacion.encode("utf-8")).hexdigest()
    codigo_legacy = str(usuario.codigo_recuperacion)
    codigo_valido = secrets.compare_digest(codigo_legacy, codigo_proporcionado)
    if len(codigo_legacy) == 6 and codigo_legacy.isdigit():
        codigo_valido = codigo_valido or secrets.compare_digest(codigo_legacy, payload.codigo_verificacion)

    if not codigo_valido:
        usuario.intentos_recuperacion += 1
        if usuario.intentos_recuperacion >= 5:
            usuario.codigo_recuperacion = None
            usuario.codigo_expira_at = None
            usuario.intentos_recuperacion = 0
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código no válido o caducado.")

    try:
        usuario.password_hash = get_password_hash(payload.nueva_password)
        usuario.codigo_recuperacion = None
        usuario.codigo_expira_at = None
        usuario.intentos_recuperacion = 0
        usuario.updated_at = ahora
        db.commit()
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario.id,
            empresa_id=None,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "usuarios", "accion": "confirmar_recuperacion_password"},
            trabajador_id=usuario.trabajador_id,
        )
        db.commit()
        return {"detail": "Tu contraseña ha sido actualizada correctamente."}
    except Exception as e:
        db.rollback()
        print(f"No se ha podido actualizar la contraseña del usuario ({usuario.id}): {e}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido actualizar la contraseña.",
        )

@router.post(
    "/recuperar-password",
    status_code=status.HTTP_200_OK,
    summary="Solicitar recuperación de contraseña",
    description="Valida el correo, genera un código aleatorio de 6 dígitos y lo envía por correo o por teléfono.",
)
@limiter.limit("5/minute")
def solicitar_recuperacion_password(
    request: Request,
    payload: PasswordRecuperacionRequest,
    db: Session = Depends(get_db),
):
    """Env?a un código temporal sin revelar si el correo o teléfono tiene cuenta."""
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de recuperación de contraseña desde la IP ({cliente_ip}).")

    medio = "email" if payload.email else "telefono" if payload.telefono else None
    identificador = payload.email.strip().lower() if payload.email else payload.telefono.strip() if payload.telefono else None
    if medio is None or identificador is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Indica un correo o teléfono válido.")

    consulta = db.query(Usuarios).filter(Usuarios.activo.is_(True))
    consulta = consulta.filter(Usuarios.email == identificador) if medio == "email" else consulta.filter(Usuarios.telefono == identificador)
    usuario = consulta.first()
    respuesta = {"detail": "Si los datos corresponden a una cuenta activa, recibirás instrucciones de recuperación."}
    if usuario is None:
        return respuesta

    codigo = f"{secrets.randbelow(1_000_000):06d}"
    try:
        usuario.codigo_recuperacion = hashlib.sha256(codigo.encode("utf-8")).hexdigest()
        usuario.codigo_expira_at = datetime.datetime.now(timezone.utc) + timedelta(minutes=15)
        usuario.intentos_recuperacion = 0
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario.id,
            empresa_id=None,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "usuarios", "accion": "solicitar_recuperacion_password"},
            trabajador_id=usuario.trabajador_id,
        )
        db.commit()
        if medio == "email":
            enviar_correo_recuperacion_contraseña(usuario.email, codigo)
        else:
            enviar_sms_recuperacion_contraseña(identificador.replace("-", ""), codigo)
        return respuesta
    except Exception as e:
        db.rollback()
        print(f"No se ha podido procesar la recuperación de contraseña para el usuario ({usuario.id}): {e}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido procesar la solicitud de recuperación de contraseña.",
        )
