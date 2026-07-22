from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.database import get_db
from core.security import obtener_usuario_actual
from schemas.tipos_evento_fichaje import TipoEventoFichajeCreate, TipoEventoFichajeResponse
from models.tipos_evento_fichaje import TiposEventoFichaje
from models.usuarios import Usuarios

router = APIRouter(prefix="/api/tipos-evento-fichaje", tags=["Tipos de Evento de Fichaje"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=TipoEventoFichajeResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")  # Protegido frente a la creación masiva no deseada de reglas maestras
def crear_tipo_evento_fichaje(
    request: Request,
    obj_in: TipoEventoFichajeCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/tipos-evento-fichaje
    Registra una nueva categoría de marcaje horario en el catálogo inmutable.
    Exclusivo para administradores.
    """
    if usuario_actual.tipo_usuario != "Administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren privilegios de administrador para modificar el catálogo maestro de eventos."
        )

    try:
        codigo_normalizado = obj_in.codigo.strip().upper()
        evento_existente = db.query(TiposEventoFichaje).filter(
            TiposEventoFichaje.codigo == codigo_normalizado
        ).first()
        
        if evento_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una categoría registrada bajo el código maestro '{codigo_normalizado}'."
            )

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
def obtener_todos_los_tipos_de_evento(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/tipos-evento-fichaje
    Devuelve el catálogo semilla completo validando que el usuario esté activo.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    return db.query(TiposEventoFichaje).order_by(TiposEventoFichaje.id.asc()).all()


@router.get("/{id_tipo_evento}", response_model=TipoEventoFichajeResponse)
def obtener_tipo_evento_por_id(
    id_tipo_evento: int, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/tipos-evento-fichaje/{id_tipo_evento}
    Busca los atributos de un tipo de marcaje validando el estado activo del usuario.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    evento = db.query(TiposEventoFichaje).filter(TiposEventoFichaje.id == id_tipo_evento).first()
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tipo de evento con ID {id_tipo_evento} no localizado en el catálogo maestro."
        )
    return evento


@router.get("/codigo/{codigo_clave}", response_model=TipoEventoFichajeResponse)
def obtener_tipo_evento_por_codigo(
    codigo_clave: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/tipos-evento-fichaje/codigo/{codigo_clave}
    Busca una regla de marcaje específica validando el estado activo del usuario.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    evento = db.query(TiposEventoFichaje).filter(
        TiposEventoFichaje.codigo == codigo_clave.strip().upper()
    ).first()
    
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna regla de fichaje bajo el código '{codigo_clave}'."
        )
    return evento