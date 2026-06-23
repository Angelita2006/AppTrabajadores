from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from core.database import get_db
from models.empresas import Empresas
from schemas.turnos import TurnoCreate, TurnoResponse
from models.turnos import Turnos

router = APIRouter(prefix="/api/turnos", tags=["Turnos Laborales"])

@router.post("", response_model=TurnoResponse, status_code=status.HTTP_201_CREATED)
def crear_turno_laboral(obj_in: TurnoCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/turnos
    Registra un nuevo cuadrante de turno teórico validando los datos con Pydantic.
    """
    try:
        # 1. Validación de seguridad: Verifica que la empresa exista
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
            )

        # 2. Mapea los datos del esquema directamente al modelo físico de la base de datos (ARRAY e ID dinámicos)
        nuevo_turno = Turnos(
            empresa_id=obj_in.empresa_id,
            nombre=obj_in.nombre,
            hora_inicio=obj_in.hora_inicio,
            hora_fin=obj_in.hora_fin,
            duracion_pausa_minutos=obj_in.duracion_pausa_minutos,
            dias_semana=obj_in.dias_semana  # Se inyecta la lista de enteros directo a la columna ARRAY
        )
        
        db.add(nuevo_turno)
        db.commit()
        db.refresh(nuevo_turno)
        return nuevo_turno

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al guardar el turno laboral: {str(error)}"
        )


@router.get("", response_model=List[TurnoResponse])
def obtener_todos_los_turnos(db: Session = Depends(get_db)):
    """
    URI: GET /api/turnos
    Devuelve el catálogo de todos los turnos teóricos de la plataforma Saas para la gestoría.
    """
    return db.query(Turnos).join(Turnos.empresa).order_by(Empresas.nombre_comercial.asc()).all()


@router.get("/empresa/{id_empresa}", response_model=List[TurnoResponse])
def obtener_turnos_empresa(id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/turnos/empresa/{id_empresa}
    Recupera los cuadrantes horarios dados de alta de forma aislada por una organización (tenant).
    """
    return db.query(Turnos).filter(Turnos.empresa_id == id_empresa).all()


@router.get("/{id_turno}", response_model=TurnoResponse)
def obtener_turno_laboral(id_turno: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/turnos/{id_turno}
    Busca las características de un turno específico utilizando su identificador único UUID.
    """
    turno = db.query(Turnos).filter(Turnos.id == id_turno).first()
    if not turno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turno laboral con ID {id_turno} no localizado en el catálogo."
        )
    return turno


@router.delete("/{id_turno}", status_code=status.HTTP_200_OK)
def eliminar_turno_maestro(id_turno: UUID, db: Session = Depends(get_db)):
    """
    URI: DELETE /api/turnos/{id_turno}
    Elimina físicamente un turno. Si se borra, las asignaciones ligadas se eliminan automáticamente (CASCADE).
    """
    turno = db.query(Turnos).filter(Turnos.id == id_turno).first()
    if not turno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turno laboral con ID {id_turno} no localizado."
        )
    
    db.delete(turno)
    db.commit()
    return {"detail": f"Turno ({id_turno}) eliminado correctamente junto con su planificación en cascada."}
