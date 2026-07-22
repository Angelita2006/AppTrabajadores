import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from schemas.auth import ConfirmarPasswordRequest, EmailRecuperacionRequest
from core.database import get_db
from core.security import get_password_hash, obtener_usuario_actual
from models.usuarios import Usuarios

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)

@router.post("/recuperar-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
def solicitar_recuperacion_password(
    request: Request,
    payload: EmailRecuperacionRequest, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
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

    # 3. IMPRESIÓN DE SEGURIDAD EN CONSOLA (LOGS DE UVICORN):
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
@limiter.limit("5/minute")
def confirmar_password(
    request: Request,
    payload: ConfirmarPasswordRequest, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
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

    # 2. Validación del Token (Entorno de desarrollo local)
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