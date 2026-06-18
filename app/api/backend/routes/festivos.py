from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from core.database import get_db
from calendarios_laborales import CalendariosLaborales
from festivos import Festivos
from schemas.festivos import FestivoCreate, FestivoResponse

router = APIRouter(prefix="/api/festivos", tags=["Festivos"])

@router.post("", response_model=FestivoResponse, status_code=status.HTTP_201_CREATED)
def crear_festivo(obj_in: FestivoCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/festivos
    Registra un nuevo día festivo (nacional, autonómico o local) dentro de un calendario laboral.
    """
    # 1. Validación de seguridad: Verifica que el calendario laboral exista
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == obj_in.calendario_id).first()
    if not calendario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendario laboral ({obj_in.calendario_id}) no encontrado."
        )

    # 2. Comprobación de la restricción de unicidad (calendario_id + fecha) para evitar duplicados
    festivo_existente = db.query(Festivos).filter(
        Festivos.calendario_id == obj_in.calendario_id,
        Festivos.fecha == obj_in.fecha
    ).first()
    
    if festivo_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un día festivo registrado para esa misma fecha en este calendario."
        )

    # 3. Mapea los datos del esquema directamente al modelo físico de la base de datos
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
def obtener_todos_los_festivos(db: Session = Depends(get_db)):
    """
    URI: GET /api/festivos
    Devuelve la lista global absoluta de todos los días festivos cargados en la plataforma.
    """
    return db.query(Festivos).all()


@router.get("/calendario/{id_calendario}", response_model=List[FestivoResponse])
def obtener_festivos_por_calendario(id_calendario: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/festivos/calendario/{id_calendario}
    Recupera de forma ordenada el catálogo de días no laborables asignados a un calendario específico.
    """
    return db.query(Festivos).filter(Festivos.calendario_id == id_calendario).order_by(Festivos.fecha.asc()).all()


@router.delete("/{id_festivo}", status_code=status.HTTP_200_OK)
def eliminar_festivo_manual(id_festivo: UUID, db: Session = Depends(get_db)):
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
    
    db.delete(festivo)
    db.commit()
    return {"detail": f"Día festivo ({id_festivo}) eliminado correctamente del calendario."}
