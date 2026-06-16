from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from core.database import get_db, next_id
from app.models.empresa import Empresa
from app.models.horario import Horario
from app.models.trabajador import Trabajador
from app.schemas.horario import HorarioCreate, HorarioResponse

# Inicialización del enrutador modular para la planificación horaria
router = APIRouter(prefix="/api/horarios", tags=["Horarios"])


@router.post("", response_model=HorarioResponse, status_code=status.HTTP_201_CREATED)
def crear_horario(obj_in: HorarioCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/horarios
    Asigna un nuevo cuadrante de horarios a un trabajador dentro de una empresa.
    """
    # 1. Validaciones de seguridad: Verifica la existencia del empleado
    trabajador = db.query(Trabajador).filter(Trabajador.id == obj_in.idTrabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador ({obj_in.idTrabajador}) no encontrado."
        )
    
    # 2. Validaciones de seguridad: Verifica la existencia de la empresa
    empresa = db.query(Empresa).filter(Empresa.id == obj_in.idEmpresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa ({obj_in.idEmpresa}) no encontrada."
        )

    # 3. Mapeo del esquema de Pydantic al modelo de SQLAlchemy
    nuevo_horario = Horario(
        id=next_id(Horario),
        idTrabajador=obj_in.idTrabajador,
        idEmpresa=obj_in.idEmpresa,
        tipoJornada=obj_in.tipoJornada,
        dias=obj_in.dias,
        diasSemana=obj_in.diasSemana,
        hora_entrada1=obj_in.hora_entrada1,
        hora_salida1=obj_in.hora_salida1,
        # Estos campos aceptan valores datetime o None (si es jornada continua)
        hora_entrada2=obj_in.hora_entrada2,
        hora_salida2=obj_in.hora_salida2,
        trabajador=trabajador,
        empresa=empresa
    )
    
    db.add(nuevo_horario)
    db.commit()
    db.refresh(nuevo_horario)
    return nuevo_horario


@router.get("", response_model=List[HorarioResponse])
def obtener_horarios(db: Session = Depends(get_db)):
    """
    URI: GET /api/horarios
    Devuelve la planificación horaria global absoluta de todo el sistema.
    """
    return db.query(Horario).all()


@router.get("/trabajador/{id_trabajador}/empresa/{id_empresa}", response_model=HorarioResponse)
def obtener_horario_trabajador_empresa(id_trabajador: int, id_empresa: int, db: Session = Depends(get_db)):
    """
    URI: GET /api/horarios/trabajador/{id_trabajador}/empresa/{id_empresa}
    Recupera el cuadrante horario específico de un empleado en una empresa concreta.
    """
    horario = db.query(Horario).filter(
        Horario.idTrabajador == id_trabajador,
        Horario.idEmpresa == id_empresa
    ).first()
    
    if not horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado un horario asignado para el trabajador en esta empresa."
        )
    return horario


@router.delete("/{id_horario}", status_code=status.HTTP_200_OK)
def eliminar_horario(id_horario: int, db: Session = Depends(get_db)):
    """
    URI: DELETE /api/horarios/{id_horario}
    Elimina un cuadrante de horario específico del sistema mediante su ID.
    """
    horario = db.query(Horario).filter(Horario.id == id_horario).first()
    if not horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Horario ({id_horario}) no encontrado."
        )
    
    db.delete(horario)
    db.commit()
    return {"detail": f"Horario ({id_horario}) eliminado correctamente."}
