from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.database import get_db
from core.security import obtener_usuario_actual
from models.empresas import Empresas
from models.motivos_pausa import MotivosPausa
from models.usuarios import Usuarios
from schemas.motivos_pausa import MotivoPausaCreate, MotivoPausaResponse

router = APIRouter(prefix="/api/motivos-pausa", tags=["Motivos de Pausa"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=MotivoPausaResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("15/minute")  # Protegido frente a la creación masiva no deseada de tipologías de pausa
def crear_motivo_pausa(
    request: Request,
    obj_in: MotivoPausaCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/motivos-pausa
    Registra una nueva tipología de descanso, ya sea global o específica de un tenant.
    """
    try:
        if obj_in.empresa_id:
            empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
            if not empresa:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
                )

        if usuario_actual.tipo_usuario != "Administrador":
            if not obj_in.empresa_id or usuario_actual.empresa_id != obj_in.empresa_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permisos para crear motivos de pausa globales o para otra empresa."
                )

        nuevo_motivo = MotivosPausa(
            nombre=obj_in.nombre,
            computa_como_trabajo=obj_in.computa_como_trabajo,
            empresa_id=obj_in.empresa_id,
            duracion_max_minutos=obj_in.duracion_max_minutos
        )
        
        db.add(nuevo_motivo)
        db.commit()
        db.refresh(nuevo_motivo)
        return nuevo_motivo

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al crear el motivo de pausa: {str(error)}"
        )


@router.get("", response_model=List[MotivoPausaResponse])
def obtener_todos_los_motivos(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/motivos-pausa
    Devuelve el catálogo absoluto o filtrado por empresa según el rol del usuario.
    """
    query = db.query(MotivosPausa)
    
    if usuario_actual.tipo_usuario != "Administrador":
        if not usuario_actual.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No estás vinculado a ninguna empresa."
            )
        query = query.filter(
            (MotivosPausa.empresa_id == usuario_actual.empresa_id) | (MotivosPausa.empresa_id == None)
        )

    return query.order_by(MotivosPausa.nombre.asc()).all()


@router.get("/empresa/{id_empresa}", response_model=List[MotivoPausaResponse])
def obtener_motivos_disponibles_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/motivos-pausa/empresa/{id_empresa}
    Recupera los motivos de descanso utilizables por una empresa: los comunes globales (NULL) 
    y los personalizados propios de esta organización.
    """
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver los motivos de pausa de esta empresa."
        )

    return db.query(MotivosPausa).filter(
        (MotivosPausa.empresa_id == id_empresa) | (MotivosPausa.empresa_id == None)
    ).order_by(MotivosPausa.nombre.asc()).all()


@router.get("/{id_motivo}", response_model=MotivoPausaResponse)
def obtener_motivo_pausa(
    id_motivo: int, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/motivos-pausa/{id_motivo}
    Busca un motivo de pausa específico mediante su identificador numérico (SmallInteger).
    """
    motivo = db.query(MotivosPausa).filter(MotivosPausa.id == id_motivo).first()
    if not motivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Motivo de pausa con ID {id_motivo} no encontrado."
        )
    
    if usuario_actual.tipo_usuario != "Administrador" and motivo.empresa_id is not None and motivo.empresa_id != usuario_actual.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder a este motivo de pausa."
        )

    return motivo