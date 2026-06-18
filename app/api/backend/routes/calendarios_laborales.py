from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from uuid import UUID
from core.database import get_db
from empresas import Empresas
from centros_trabajo import CentrosTrabajo
from calendarios_laborales import CalendariosLaborales
from schemas.calendarios_laborales import CalendarioLaboralCreate, CalendarioLaboralResponse

router = APIRouter(prefix="/api/calendarios-laborales", tags=["Calendarios Laborales"])

@router.post("", response_model=CalendarioLaboralResponse, status_code=status.HTTP_201_CREATED)
def crear_calendario_laboral(obj_in: CalendarioLaboralCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/calendarios-laborales
    Registra un nuevo calendario laboral anual asociándolo a una empresa o centro de trabajo.
    """
    try:
        # 1. Validación de seguridad: Verifica que la empresa exista
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
            )

        # 2. Validación de seguridad: Si se asocia a un centro, verifica que exista
        if obj_in.centro_trabajo_id:
            centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == obj_in.centro_trabajo_id).first()
            if not centro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Centro de trabajo ({obj_in.centro_trabajo_id}) no encontrado."
                )

        # 3. Mapea los datos del esquema directamente al modelo físico de SQLAlchemy
        nuevo_calendario = CalendariosLaborales(
            empresa_id=obj_in.empresa_id,
            anio=obj_in.anio,
            nombre=obj_in.nombre,
            centro_trabajo_id=obj_in.centro_trabajo_id
        )
        
        db.add(nuevo_calendario)
        db.commit()
        db.refresh(nuevo_calendario)
        return nuevo_calendario

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al crear el calendario laboral: {str(error)}"
        )


@router.get("", response_model=List[CalendarioLaboralResponse])
def obtener_todos_los_calendarios(db: Session = Depends(get_db)):
    """
    URI: GET /api/calendarios-laborales
    Devuelve la lista global de todos los calendarios del sistema Saas para la gestoría.
    """
    return db.query(CalendariosLaborales).all()


@router.get("/empresa/{id_empresa}", response_model=List[CalendarioLaboralResponse])
def obtener_calendarios_empresa(id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/calendarios-laborales/empresa/{id_empresa}
    Recupera los calendarios dados de alta de forma aislada por una organización (tenant).
    """
    return db.query(CalendariosLaborales).filter(CalendariosLaborales.empresa_id == id_empresa).all()


@router.get("/centro/{id_centro}", response_model=List[CalendarioLaboralResponse])
def obtener_calendarios_centro(id_centro: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/calendarios-laborales/centro/{id_centro}
    Recupera los calendarios asociados específicamente a una sede física concreta.
    """
    return db.query(CalendariosLaborales).filter(CalendariosLaborales.centro_trabajo_id == id_centro).all()


@router.get("/{id_calendario}", response_model=CalendarioLaboralResponse)
def obtener_calendario_laboral(id_calendario: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/calendarios-laborales/{id_calendario}
    Busca un calendario laboral específico mediante su identificador único UUID.
    """
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == id_calendario).first()
    if not calendario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendario laboral con ID {id_calendario} no encontrado."
        )
    return calendario


@router.delete("/{id_calendario}", status_code=status.HTTP_200_OK)
def eliminar_calendario_laboral(id_calendario: UUID, db: Session = Depends(get_db)):
    """
    URI: DELETE /api/calendarios-laborales/{id_calendario}
    Elimina físicamente un calendario. Al tener 'ondelete=CASCADE', la base de datos 
    borrará de forma automática todos sus festivos asociados.
    """
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == id_calendario).first()
    if not calendario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendario laboral con ID {id_calendario} no encontrado."
        )
    
    db.delete(calendario)
    db.commit()
    return {"detail": f"Calendario laboral ({id_calendario}) eliminado correctamente junto con sus festivos asociados."}
