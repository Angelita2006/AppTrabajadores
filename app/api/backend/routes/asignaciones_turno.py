from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db, next_id
from fastapi import APIRouter
from core.database import get_db
from schemas.asignaciones_turno import AsignacionTurnoCreate, AsignacionTurnoResponse
from asignaciones_turno import AsignacionesTurno

router = APIRouter(prefix="/api/asignacion-turno", tags=["Empresas"])

@router.post("", response_model=AsignacionTurnoResponse, status_code=status.HTTP_201_CREATED)
def crear_asignacion_turno(obj_in: AsignacionTurnoCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/empresas
    Registra una nueva empresa en el sistema validando los datos con Pydantic.
    """
    try:
        # Verifica si el id ya existe previamente en el sistema para evitar duplicados
        # asignacion_turno_existente = db.query(AsignacionesTurno).filter(AsignacionesTurno. == obj_in.cif).first()
        # if asignacion_turno_existente:
        #     raise HTTPException(
        #         status_code=status.HTTP_400_BAD_REQUEST,
        #         detail=f"Ya existe una asignación de turno registrada  {obj_in.cif}."
        #     )

        # Mapea los datos del esquema directamente al modelo físico de SQLAlchemy
        nueva_empresa = AsignacionesTurno(
            id=next_id(AsignacionesTurno), 
            # nombre=obj_in.nombre,
            # cif=obj_in.cif,
            # direccion=obj_in.direccion,
            # codigo_postal=obj_in.codigo_postal,
            # poblacion=obj_in.poblacion,
            # provincia=obj_in.provincia
        )
        
        db.add(nueva_empresa)
        db.commit()
        db.refresh(nueva_empresa)
        return nueva_empresa

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al crear la empresa: {str(error)}"
        )
