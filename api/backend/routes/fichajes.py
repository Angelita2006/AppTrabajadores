from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from uuid import UUID
from core.database import get_db
from models.empresas import Empresas
from models.fichajes import Fichajes
from schemas.fichajes import FichajeCreate, FichajeResponse
from models.trabajadores import Trabajadores

router = APIRouter(prefix="/api/fichajes", tags=["Fichajes"])

@router.post("", response_model=FichajeResponse, status_code=status.HTTP_201_CREATED)
def crear_fichaje(obj_in: FichajeCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/fichajes
    Registra un evento de jornada inmutable calculando el tiempo oficial en el servidor.
    """
    # 1. Validaciones de seguridad: Verifica que el trabajador exista
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador ({obj_in.trabajador_id}) no encontrado."
        )
    
    # 2. Validaciones de seguridad: Verifica que la empresa exista
    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
        )

    ahora = datetime.now()

    # 3. Mapeo directo al modelo físico de la base de datos inmutable (append-only)
    nuevo_fichaje = Fichajes(
        empresa_id=obj_in.empresa_id,
        trabajador_id=obj_in.trabajador_id,
        centro_trabajo_id=obj_in.centro_trabajo_id,
        tipo_evento_id=obj_in.tipo_evento_id,
        metodo_fichaje=obj_in.metodo_fichaje,
        fecha_hora=ahora,
        # Campos opcionales de auditoría transmitidos por la app móvil
        latitud=obj_in.latitud,
        longitud=obj_in.longitud,
        observaciones=obj_in.observaciones,
        fecha_hora_dispositivo=obj_in.fecha_hora_dispositivo,
        dispositivo_id=obj_in.dispositivo_id,
        motivo_pausa_id=obj_in.motivo_pausa_id
        # Nota: 'ip_address' se puede procesar a un entero o inyectar directamente según el controlador de red
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
    return db.query(Fichajes).all()


@router.get("/trabajador/{id_trabajador}/empresa/{id_empresa}", response_model=List[FichajeResponse])
def obtener_fichajes_trabajador_empresa(id_trabajador: UUID, id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/fichajes/trabajador/{id_trabajador}/empresa/{id_empresa}
    Recupera el historial completo de marcajes para un usuario y organización particulares.
    """
    # Verifica la existencia de las entidades antes de realizar el volcado de datos
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador ({id_trabajador}) no encontrado."
        )
    
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa ({id_empresa}) no encontrada."
        )

    # Realiza la consulta filtrando por ambas llaves foráneas UUID de la tabla
    return db.query(Fichajes).filter(
        Fichajes.trabajador_id == id_trabajador,
        Fichajes.empresa_id == id_empresa
    ).all()


@router.get("/{id_fichaje}", response_model=FichajeResponse)
def obtener_fichaje(id_fichaje: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/fichajes/{id_fichaje}
    Busca un evento de fichaje específico mediante su identificador único UUID.
    """
    fichaje = db.query(Fichajes).filter(Fichajes.id == id_fichaje).first()
    if not fichaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fichaje ({id_fichaje}) no encontrado."
        )
    return fichaje
