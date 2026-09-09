from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.future import select
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.usuarios import Usuarios
from models.dispositivos_push import DispositivosPush
from schemas.dispositivos_push import (
    DispositivoPushCreate,
    DispositivoPushResponse,
)

# APIRouter agrupa todos los endpoints relacionados con la gestión de dispositivos push bajo el prefijo "/api/dispositivos-push".
router = APIRouter(prefix="/api/dispositivos-push", tags=["Dispositivos Push"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
# Esto previene ataques de fuerza bruta o saturación de peticiones en rutas críticas.
limiter = Limiter(key_func=get_remote_address)


@router.post("/", response_model=DispositivoPushResponse, status_code=status.HTTP_201_CREATED, summary="Registrar o actualizar dispositivo push")
@limiter.limit("30/minute")  # Limita este endpoint a un máximo de 30 peticiones por minuto por IP
def registrar_o_actualizar_dispositivo_push(
    request: Request,
    data: DispositivoPushCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **POST /api/dispositivos-push/**
    
    Registra un nuevo token FCM o lo actualiza si el token o el usuario ya disponen de registro,
    garantizando que se mantenga asociado el canal de notificaciones activo.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro/actualización de dispositivo push desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    es_admin_empresa = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_EMPRESA

    if not es_admin_gestoria and not es_admin_empresa and usuario_actual.id != data.usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para registrar dispositivos push para otro usuario."
        )

    usuario_objetivo = db.query(Usuarios).options(
        joinedload(Usuarios.empresa)
    ).filter(Usuarios.id == data.usuario_id).first()

    if not usuario_objetivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El usuario especificado con ID ({data.usuario_id}) para el dispositivo push no existe."
        )

    if es_admin_empresa and usuario_actual.empresa_id and usuario_actual.empresa_id != usuario_objetivo.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para gestionar dispositivos push de usuarios de otra empresa."
        )

    try:
        stmt = select(DispositivosPush).options(
            joinedload(DispositivosPush.usuario).joinedload(Usuarios.empresa)
        ).where(DispositivosPush.fcm_token == data.fcm_token)
        dispositivo_existente = db.execute(stmt).scalars().first()

        if dispositivo_existente:
            dispositivo_existente.plataforma = data.plataforma or dispositivo_existente.plataforma
            dispositivo_existente.usuario_id = data.usuario_id  
            db.commit()

            dispositivo_actualizado = db.query(DispositivosPush).options(
                joinedload(DispositivosPush.usuario).joinedload(Usuarios.empresa)
            ).filter(DispositivosPush.id == dispositivo_existente.id).first()
            
            return dispositivo_actualizado

        stmt_user = select(DispositivosPush).options(
            joinedload(DispositivosPush.usuario).joinedload(Usuarios.empresa)
        ).where(DispositivosPush.usuario_id == data.usuario_id)

        usuario_dispositivo = db.execute(stmt_user).scalars().first()

        if usuario_dispositivo:
            usuario_dispositivo.fcm_token = data.fcm_token
            usuario_dispositivo.plataforma = data.plataforma or usuario_dispositivo.plataforma
            db.commit()

            dispositivo_actualizado = db.query(DispositivosPush).options(
                joinedload(DispositivosPush.usuario).joinedload(Usuarios.empresa)
            ).filter(DispositivosPush.id == usuario_dispositivo.id).first()
            
            return dispositivo_actualizado

        nuevo_dispositivo = DispositivosPush(
            usuario_id=data.usuario_id,
            fcm_token=data.fcm_token,
            plataforma=data.plataforma
        )

        db.add(nuevo_dispositivo)
        db.commit()

        dispositivo_creado = db.query(DispositivosPush).options(
            joinedload(DispositivosPush.usuario).joinedload(Usuarios.empresa)
        ).filter(DispositivosPush.id == nuevo_dispositivo.id).first()

        return dispositivo_creado

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar el dispositivo push: {str(error)}"
        )


@router.delete("/{id_dispositivo}", status_code=status.HTTP_200_OK, summary="Eliminar dispositivo push")
@limiter.limit("30/minute")  # Limita este endpoint a un máximo de 30 peticiones por minuto por IP
def eliminar_dispositivo_push(
    request: Request,
    id_dispositivo: uuid.UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **DELETE /api/dispositivos-push/{id_dispositivo}**
    
    Elimina un token push del sistema (por ejemplo, al cerrar sesión en la app móvil).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de eliminación del dispositivo push {id_dispositivo} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    try:
        dispositivo = db.query(DispositivosPush).options(
            joinedload(DispositivosPush.usuario).joinedload(Usuarios.empresa)
        ).filter(DispositivosPush.id == id_dispositivo).first()

        if not dispositivo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dispositivo push con ID ({id_dispositivo}) no encontrado."
            )
        
        es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
        es_admin_empresa = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_EMPRESA

        if not es_admin_gestoria and usuario_actual.id != dispositivo.usuario_id:
            if not es_admin_empresa:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Acceso denegado. No tienes permisos para eliminar este dispositivo push."
                )
            
            dueño_dispositivo = dispositivo.usuario
            if not dueño_dispositivo or (usuario_actual.empresa_id and usuario_actual.empresa_id != dueño_dispositivo.empresa_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Acceso denegado. No tienes permisos para eliminar este dispositivo push de otra empresa."
                )
        
        db.delete(dispositivo)
        db.commit()
        return {"detail": f"Dispositivo push ({id_dispositivo}) eliminado correctamente."}
        
    except HTTPException as he:
        raise he
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar el dispositivo push: {str(error)}"
        )


@router.get("/usuario/{usuario_id}", response_model=List[DispositivoPushResponse], summary="Obtener dispositivos push por usuario")
@limiter.limit("60/minute")  # Limita las consultas masivas de listados de dispositivos push por usuario
def obtener_dispositivos_por_usuario(
    request: Request,
    usuario_id: uuid.UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/dispositivos-push/usuario/{usuario_id}**
    
    Recupera todos los dispositivos push asociados a un usuario específico aplicando controles multi-tenant.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de dispositivos push para el usuario {usuario_id} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    es_admin_empresa = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_EMPRESA

    if not es_admin_gestoria and usuario_actual.id != usuario_id:
        if not es_admin_empresa:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No tienes permisos para consultar los dispositivos de este usuario."
            )
        
        usuario_objetivo = db.query(Usuarios).options(
            joinedload(Usuarios.empresa)
        ).filter(Usuarios.id == usuario_id).first()
        if not usuario_objetivo or (usuario_actual.empresa_id and usuario_actual.empresa_id != usuario_objetivo.empresa_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No tienes autorización para consultar dispositivos de usuarios externos a tu empresa."
            )

    try:
        stmt = select(DispositivosPush).options(
            joinedload(DispositivosPush.usuario).joinedload(Usuarios.empresa)
        ).where(DispositivosPush.usuario_id == usuario_id)
        dispositivos = db.execute(stmt).scalars().all()
        return dispositivos
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al recuperar los dispositivos del usuario: {str(error)}"
        )