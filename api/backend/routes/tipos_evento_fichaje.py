from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from schemas.tipos_evento_fichaje import TipoEventoFichajeCreate, TipoEventoFichajeResponse
from models.tipos_evento_fichaje import TiposEventoFichaje

router = APIRouter(prefix="/api/tipos-evento-fichaje", tags=["Tipos de Evento de Fichaje"])

@router.post("", response_model=TipoEventoFichajeResponse, status_code=status.HTTP_201_CREATED)
def crear_tipo_evento_fichaje(obj_in: TipoEventoFichajeCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/tipos-evento-fichaje
    Registra una nueva categoría de marcaje horario en el catálogo inmutable del sistema Saas.
    """
    try:
        # 1. Comprobación de la restricción de unicidad del código clave (Ej: 'ENTRADA')
        codigo_normalizado = obj_in.codigo.strip().upper()
        evento_existente = db.query(TiposEventoFichaje).filter(
            TiposEventoFichaje.codigo == codigo_normalizado
        ).first()
        
        if evento_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una categoría registrada bajo el código maestro '{codigo_normalizado}'."
            )

        # 2. Mapea los datos del esquema directamente al modelo físico de la base de datos (SmallInteger)
        nuevo_evento = TiposEventoFichaje(
            codigo=codigo_normalizado,
            descripcion=obj_in.descripcion,
            computa_como_trabajo=obj_in.computa_como_trabajo
        )
        
        db.add(nuevo_evento)
        db.commit()
        db.refresh(nuevo_evento)
        return nuevo_evento

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error de integridad al guardar el tipo de evento: {str(error)}"
        )


@router.get("", response_model=List[TipoEventoFichajeResponse])
def obtener_todos_los_tipos_de_evento(db: Session = Depends(get_db)):
    """
    URI: GET /api/tipos-evento-fichaje
    Devuelve el catálogo semilla completo de marcajes horarios válidos en la plataforma.
    """
    return db.query(TiposEventoFichaje).order_by(TiposEventoFichaje.id.asc()).all()


@router.get("/{id_tipo_evento}", response_model=TipoEventoFichajeResponse)
def obtener_tipo_evento_por_id(id_tipo_evento: int, db: Session = Depends(get_db)):
    """
    URI: GET /api/tipos-evento-fichaje/{id_tipo_evento}
    Busca los atributos de un tipo de marcaje utilizando su identificador numérico entero (SmallInteger).
    """
    evento = db.query(TiposEventoFichaje).filter(TiposEventoFichaje.id == id_tipo_evento).first()
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tipo de evento con ID {id_tipo_evento} no localizado en el catálogo maestro."
        )
    return evento


@router.get("/codigo/{codigo_clave}", response_model=TipoEventoFichajeResponse)
def obtener_tipo_evento_por_codigo(codigo_clave: str, db: Session = Depends(get_db)):
    """
    URI: GET /api/tipos-evento-fichaje/codigo/{codigo_clave}
    Busca una regla de marcaje específica mediante su código en mayúsculas (Ej: 'INICIO_PAUSA').
    """
    evento = db.query(TiposEventoFichaje).filter(
        TiposEventoFichaje.codigo == codigo_clave.strip().upper()
    ).first()
    
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna regla de fichaje bajo el código '{codigo_clave}'."
        )
    return evento
