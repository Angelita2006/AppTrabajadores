from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List
from uuid import UUID
from core.database import get_db
from schemas.asignaciones_turno import AsignacionTurnoCreate, AsignacionTurnoResponse
from models.trabajadores import Trabajadores
from models.turnos import Turnos
from models.asignaciones_turno import AsignacionesTurno

router = APIRouter(prefix="/api/asignaciones-turno", tags=["Asignaciones de Turno"])

@router.post("", response_model=AsignacionTurnoResponse, status_code=status.HTTP_201_CREATED)
def asignar_turno_trabajador(obj_in: AsignacionTurnoCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/asignaciones-turno
    Vincula a un trabajador con un turno teórico fijando su fecha de inicio de vigencia.
    """
    # 1. Validaciones estructurales básicas de existencia
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    turno = db.query(Turnos).filter(Turnos.id == obj_in.turno_id).first()
    if not turno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turno teórico no encontrado.")

    # 2. Mapeo y volcado directo al modelo físico de la base de datos
    nueva_asignacion = AsignacionesTurno(
        trabajador_id=obj_in.trabajador_id,
        turno_id=obj_in.turno_id,
        fecha_inicio=obj_in.fecha_inicio,
        fecha_fin=obj_in.fecha_fin
    )

    try:
        db.add(nueva_asignacion)
        db.commit()
        db.refresh(nueva_asignacion)
        return nueva_asignacion
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al consolidar la asignación en la base de datos: {str(error)}"
        )


@router.get("", response_model=List[AsignacionTurnoResponse])
def obtener_todas_las_asignaciones(db: Session = Depends(get_db)):
    """
    URI: GET /api/asignaciones-turno
    Devuelve la planificación e historial global de asignaciones de la plataforma.
    """
    return db.query(AsignacionesTurno).all()


@router.get("/trabajador/{id_trabajador}", response_model=List[AsignacionTurnoResponse])
def obtener_asignaciones_por_trabajador(id_trabajador: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/asignaciones-turno/trabajador/{id_trabajador}
    Recupera el cuadrante histórico y actual de turnos planificados para un operario específico.
    """
    return db.query(AsignacionesTurno).filter(AsignacionesTurno.trabajador_id == id_trabajador).all()

@router.put("/{id_asignacion}/editar", response_model=AsignacionTurnoResponse)
def editar_asignacion_turno(id_asignacion: UUID, fecha_fin: date, fecha_inicio = None,  db: Session = Depends(get_db)):
    """
    URI: PUT /api/asignaciones-turno/{id_asignacion}/editar?fecha_fin=AAAA-MM-DD
    Edita los datos sobre un turno asignado para permitir rotaciones horarias.
    """
    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación de turno no encontrada.")

    # Emulación en la capa de la API de la regla lógica CheckConstraint de la base de datos
    if asignacion.fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de finalización no puede ser previa a la fecha de inicio del turno."
        )

    # Modificación segura utilizando setattr para eludir advertencias estrictas de tipo en Pylance
    if fecha_inicio is not None:   
        setattr(asignacion, "fecha_inicio", fecha_inicio)
        
    setattr(asignacion, "fecha_fin", fecha_fin)
    
    db.commit()
    db.refresh(asignacion)
    return asignacion

@router.put("/{id_asignacion}/finalizar", response_model=AsignacionTurnoResponse)
def finalizar_vigencia_turno(id_asignacion: UUID, fecha_fin: date, db: Session = Depends(get_db)):
    """
    URI: PUT /api/asignaciones-turno/{id_asignacion}/finalizar?fecha_fin=AAAA-MM-DD
    Establece la fecha de corte o vencimiento de un turno asignado para permitir rotaciones horarias.
    """
    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación de turno no encontrada.")

    # Emulación en la capa de la API de la regla lógica CheckConstraint de la base de datos
    if asignacion.fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de finalización no puede ser previa a la fecha de inicio del turno."
        )

    # Modificación segura utilizando setattr para eludir advertencias estrictas de tipo en Pylance
    setattr(asignacion, "fecha_fin", fecha_fin)
    
    db.commit()
    db.refresh(asignacion)
    return asignacion


@router.delete("/{id_asignacion}", status_code=status.HTTP_200_OK)
def eliminar_asignacion_turno(id_asignacion: UUID, db: Session = Depends(get_db)):
    """
    URI: DELETE /api/asignaciones-turno/{id_asignacion}
    Elimina físicamente una asignación del plan. Tu base de datos aplica 'ondelete=CASCADE' 
    si se borra la plantilla del turno maestro, pero este endpoint permite revocar un alta errónea de forma manual.
    """
    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación de turno no encontrada.")

    db.delete(asignacion)
    db.commit()
    return {"detail": f"Asignación ({id_asignacion}) eliminada correctamente del cuadrante."}
