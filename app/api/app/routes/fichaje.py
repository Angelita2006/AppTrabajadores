from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from core.database import get_db, next_id
from app.models.empresa import Empresa
from app.models.fichaje import Fichaje
from app.models.trabajador import Trabajador
from schemas.fichaje import FichajeCreate, FichajeResponse

# Inicialización del enrutador modular para el control horario
router = APIRouter(prefix="/api/fichajes", tags=["Fichajes"])


@router.post("", response_model=FichajeResponse, status_code=status.HTTP_201_CREATED)
def crear_fichaje(obj_in: FichajeCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/fichajes
    Registra un evento de jornada (entrada, salida o descanso) calculando el tiempo en el servidor.
    """
    # 1. Validaciones de seguridad: Verifica que el trabajador exista
    trabajador = db.query(Trabajador).filter(Trabajador.id == obj_in.idTrabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador ({obj_in.idTrabajador}) no encontrado."
        )
    
    # 2. Validaciones de seguridad: Verifica que la empresa exista
    empresa = db.query(Empresa).filter(Empresa.id == obj_in.idEmpresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa ({obj_in.idEmpresa}) no encontrada."
        )

    ahora = datetime.now()

    # 3. Mapeo y guardado en la base de datos
    nuevo_fichaje = Fichaje(
        id=next_id(Fichaje), 
        idTrabajador=obj_in.idTrabajador,
        idEmpresa=obj_in.idEmpresa,
        tipo=obj_in.tipo,
        fecha=int(ahora.timestamp()),  # Convierte el objeto de fecha a entero numérico
        fecha_hora=ahora, 
        trabajador=trabajador,
        empresa=empresa 
    )
    
    db.add(nuevo_fichaje)
    db.commit()
    db.refresh(nuevo_fichaje)
    return nuevo_fichaje


@router.get("", response_model=List[FichajeResponse])
def obtener_fichajes(db: Session = Depends(get_db)):
    """
    URI: GET /api/fichajes
    Devuelve el historial global absoluto de todos los fichajes de la plataforma.
    """
    return db.query(Fichaje).all()


@router.get("/trabajador/{id_trabajador}/empresa/{id_empresa}", response_model=List[FichajeResponse])
def obtener_fichajes_trabajador_empresa(id_trabajador: int, id_empresa: int, db: Session = Depends(get_db)):
    """
    URI: GET /api/fichajes/trabajador/{id_trabajador}/empresa/{id_empresa}
    Recupera el historial cronológico de marcajes del día de hoy para un usuario y organización particulares.
    """
    # Verifica la existencia de las entidades antes de realizar el volcado de datos
    trabajador = db.query(Trabajador).filter(Trabajador.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador ({id_trabajador}) no encontrado."
        )
    
    empresa = db.query(Empresa).filter(Empresa.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa ({id_empresa}) no encontrada."
        )

    # Realiza la consulta filtrando por ambas llaves foráneas
    return db.query(Fichaje).filter(
        Fichaje.idTrabajador == id_trabajador,
        Fichaje.idEmpresa == id_empresa
    ).all()


@router.get("/{id_fichaje}", response_model=FichajeResponse)
def obtener_fichaje(id_fichaje: int, db: Session = Depends(get_db)):
    """
    URI: GET /api/fichajes/{id_fichaje}
    Busca un evento de fichaje específico mediante su identificador único.
    """
    fichaje = db.query(Fichaje).filter(Fichaje.id == id_fichaje).first()
    if not fichaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fichaje ({id_fichaje}) no encontrado."
        )
    return fichaje


@router.delete("/{id_fichaje}", status_code=status.HTTP_200_OK)
def eliminar_fichaje(id_fichaje: int, db: Session = Depends(get_db)):
    """
    URI: DELETE /api/fichajes/{id_fichaje}
    Elimina permanentemente un fichaje del registro de la base de datos utilizando su ID.
    """
    fichaje = db.query(Fichaje).filter(Fichaje.id == id_fichaje).first()
    if not fichaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fichaje ({id_fichaje}) no encontrado."
        )
    
    db.delete(fichaje)
    db.commit()
    return {"detail": f"Fichaje ({id_fichaje}) eliminado correctamente."}
