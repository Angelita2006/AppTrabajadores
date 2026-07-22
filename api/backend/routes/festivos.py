from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import String
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.database import get_db
from core.security import obtener_usuario_actual
from models.calendarios_laborales import CalendariosLaborales
from models.usuarios import Usuarios
from models.festivos import Festivos
from schemas.festivos import FestivoCreate, FestivoResponse

router = APIRouter(prefix="/api/festivos", tags=["Festivos"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=FestivoResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("15/minute")  # Protegido frente a la creación masiva no deseada de días festivos
def crear_festivo(
    request: Request,
    obj_in: FestivoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/festivos
    Registra un nuevo día festivo (nacional, autonómico o local) dentro de un calendario laboral.
    """
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == obj_in.calendario_id).first()
    if not calendario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendario laboral ({obj_in.calendario_id}) no encontrado."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != calendario.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear festivos en este calendario."
        )

    festivo_existente = db.query(Festivos).filter(
        Festivos.calendario_id == obj_in.calendario_id,
        Festivos.fecha == obj_in.fecha
    ).first()
    
    if festivo_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un día festivo registrado para esa misma fecha en este calendario."
        )

    nuevo_festivo = Festivos(
        calendario_id=obj_in.calendario_id,
        fecha=obj_in.fecha,
        tipo=obj_in.tipo,
        descripcion=obj_in.descripcion
    )
    
    try:
        db.add(nuevo_festivo)
        db.commit()
        db.refresh(nuevo_festivo)
        return nuevo_festivo
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error de integridad al guardar el día festivo: {str(error)}"
        )


@router.get("", response_model=List[FestivoResponse])
def obtener_todos_los_festivos(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/festivos
    Devuelve la lista global de días festivos aplicando aislamiento multi-tenant a través del calendario laboral.
    """
    query = db.query(Festivos).join(Festivos.calendario)
    
    if usuario_actual.tipo_usuario != "Administrador":
        if not usuario_actual.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No estás vinculado a ninguna empresa."
            )
        query = query.filter(CalendariosLaborales.empresa_id == usuario_actual.empresa_id)

    return query.order_by(Festivos.fecha.asc()).all()


@router.get("/calendario/{id_calendario}", response_model=List[FestivoResponse])
def obtener_festivos_por_calendario(
    id_calendario: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/festivos/calendario/{id_calendario}
    Recupera de forma ordenada el catálogo de días no laborables asignados a un calendario específico.
    """
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == id_calendario).first()
    if not calendario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendario laboral ({id_calendario}) no encontrado."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != calendario.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los festivos de este calendario."
        )

    return db.query(Festivos).filter(Festivos.calendario_id == id_calendario).order_by(Festivos.fecha.asc()).all()


@router.put("/{id_festivo}/editar", response_model=FestivoResponse)
def editar_festivo(
    id_festivo: UUID, 
    nueva_fecha = None, 
    nuevo_tipo = None, 
    nueva_descripcion = None, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: PUT /api/festivos/{id_festivo}/editar
    Modifica la fecha, el tipo o la descripción del festivo.
    """
    festivo = db.query(Festivos).filter(Festivos.id == id_festivo).first()
    
    if not festivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ningún festivo con el ID {id_festivo}."
        )
    
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == festivo.calendario_id).first()
    if usuario_actual.tipo_usuario != "Administrador" and calendario and usuario_actual.empresa_id != calendario.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para editar este festivo."
        )
    
    if nueva_fecha is not None:
        setattr(festivo, "fecha", nueva_fecha)
    if nuevo_tipo is not None:
        setattr(festivo, "tipo", nuevo_tipo)
    if nueva_descripcion is not None:
        setattr(festivo, "descripcion", nueva_descripcion)
    setattr(festivo, "updated_at", datetime.now())
    
    db.commit()
    db.refresh(festivo)
    return festivo


@router.delete("/{id_festivo}", status_code=status.HTTP_200_OK)
def eliminar_festivo_manual(
    id_festivo: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: DELETE /api/festivos/{id_festivo}
    Elimina físicamente un día festivo concreto del cuadrante mediante su ID único UUID.
    """
    festivo = db.query(Festivos).filter(Festivos.id == id_festivo).first()
    if not festivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Día festivo con ID {id_festivo} no encontrado."
        )
    
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == festivo.calendario_id).first()
    if usuario_actual.tipo_usuario != "Administrador" and calendario and usuario_actual.empresa_id != calendario.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar este festivo."
        )
    
    db.delete(festivo)
    db.commit()
    return {"detail": f"Día festivo ({id_festivo}) eliminado correctamente del calendario."}