from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
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

router = APIRouter(prefix="/api/dispositivos-push", tags=["Dispositivos Push"])

limiter = Limiter(key_func=get_remote_address)


@router.post("/", response_model=DispositivoPushResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def registrar_o_actualizar_dispositivo_push(
    request: Request,
    data: DispositivoPushCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    Registra un nuevo token FCM o lo actualiza si el token o el usuario ya disponen de registro,
    garantizando que se mantenga asociado el canal de notificaciones activo.
    """
    # Si el usuario actual no es admin gestoría ni admin empresa, debe registrar únicamente sus propios tokens
    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    es_admin_empresa = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_EMPRESA

    if not es_admin_gestoria and not es_admin_empresa and usuario_actual.id != data.usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar dispositivos push para otro usuario."
        )

    # Validar que el usuario objetivo exista y pertenezca al mismo tenant si es administrador de empresa
    usuario_objetivo = db.query(Usuarios).filter(Usuarios.id == data.usuario_id).first()
    if not usuario_objetivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario especificado para el dispositivo push no existe."
        )

    if es_admin_empresa and usuario_actual.empresa_id and usuario_actual.empresa_id != usuario_objetivo.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para gestionar dispositivos push de usuarios de otra empresa."
        )

    try:
        # Verificar si el fcm_token exacto ya existe
        stmt = select(DispositivosPush).where(DispositivosPush.fcm_token == data.fcm_token)
        dispositivo_existente = db.execute(stmt).scalars().first()

        if dispositivo_existente:
            # Actualizar la plataforma y la fecha si ya existía el token
            dispositivo_existente.plataforma = data.plataforma or dispositivo_existente.plataforma
            dispositivo_existente.usuario_id = data.usuario_id  # Asegurar asociacion correcta
            db.commit()
            db.refresh(dispositivo_existente)
            return dispositivo_existente

        # Si no existe el token, verificar si el usuario ya tiene un dispositivo registrado para actualizarlo o crear uno nuevo
        stmt_user = select(DispositivosPush).where(DispositivosPush.usuario_id == data.usuario_id)
        usuario_dispositivo = db.execute(stmt_user).scalars().first()

        if usuario_dispositivo:
            usuario_dispositivo.fcm_token = data.fcm_token
            usuario_dispositivo.plataforma = data.plataforma or usuario_dispositivo.plataforma
            db.commit()
            db.refresh(usuario_dispositivo)
            return usuario_dispositivo

        # Crear nuevo registro si no existe ni el token ni el usuario previo
        nuevo_dispositivo = DispositivosPush(
            usuario_id=data.usuario_id,
            fcm_token=data.fcm_token,
            plataforma=data.plataforma
        )
        db.add(nuevo_dispositivo)
        db.commit()
        db.refresh(nuevo_dispositivo)
        return nuevo_dispositivo

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar el dispositivo push: {str(error)}"
        )


@router.get("/usuario/{usuario_id}", response_model=List[DispositivoPushResponse])
def obtener_dispositivos_por_usuario(
    usuario_id: uuid.UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    Recupera todos los dispositivos push asociados a un usuario específico aplicando controles multi-tenant.
    """
    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    es_admin_empresa = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_EMPRESA

    if not es_admin_gestoria and usuario_actual.id != usuario_id:
        if not es_admin_empresa:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para consultar los dispositivos de este usuario."
            )
        
        # Validar tenant si es admin de empresa
        usuario_objetivo = db.query(Usuarios).filter(Usuarios.id == usuario_id).first()
        if not usuario_objetivo or (usuario_actual.empresa_id and usuario_actual.empresa_id != usuario_objetivo.empresa_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes autorización para consultar dispositivos de usuarios externos a tu empresa."
            )

    try:
        stmt = select(DispositivosPush).where(DispositivosPush.usuario_id == usuario_id)
        dispositivos = db.execute(stmt).scalars().all()
        return dispositivos
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al recuperar los dispositivos del usuario: {str(error)}"
        )


@router.delete("/{id_dispositivo}", status_code=status.HTTP_200_OK)
def eliminar_dispositivo_push(
    id_dispositivo: uuid.UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    Elimina un token push del sistema (por ejemplo, al cerrar sesión en la app móvil).
    """
    try:
        dispositivo = db.get(DispositivosPush, id_dispositivo)
        if not dispositivo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispositivo push no encontrado."
            )
        
        es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
        es_admin_empresa = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_EMPRESA

        if not es_admin_gestoria and usuario_actual.id != dispositivo.usuario_id:
            if not es_admin_empresa:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permisos para eliminar este dispositivo push."
                )
            
            # Verificar pertenencia a la empresa del administrador de empresa
            dueño_dispositivo = db.query(Usuarios).filter(Usuarios.id == dispositivo.usuario_id).first()
            if not dueño_dispositivo or (usuario_actual.empresa_id and usuario_actual.empresa_id != dueño_dispositivo.empresa_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permisos para eliminar este dispositivo push de otra empresa."
                )
        
        db.delete(dispositivo)
        db.commit()
        return {"detail": "Dispositivo push eliminado correctamente."}
        
    except HTTPException as he:
        raise he
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar el dispositivo push: {str(error)}"
        )