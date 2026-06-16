from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db, next_id
from models.empresa import Empresa
from models.incidencia import Incidencia
from models.trabajador import Trabajador
from schemas.incidencia import IncidenciaCreate, IncidenciaResponse

# Inicialización del enrutador modular para el reporte de incidencias
router = APIRouter(prefix="/api/incidencias", tags=["Incidencias"])

@router.post("", response_model=IncidenciaResponse, status_code=status.HTTP_201_CREATED)
def crear_incidencia(obj_in: IncidenciaCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/incidencias
    Registra una nueva incidencia laboral en el sistema en estado 'abierta' por defecto.
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

    # 3. Mapeo y almacenamiento en la base de datos
    nueva_incidencia = Incidencia(
        id=next_id(Incidencia),
        idTrabajador=obj_in.idTrabajador,
        idEmpresa=obj_in.idEmpresa,
        tipo=obj_in.tipo,
        fecha=obj_in.fecha,         # Recibe la cadena de texto con formato AAAA-MM-DD
        descripcion=obj_in.descripcion,
        estado="abierta"            # Fuerza el estado inicial por defecto
    )
    
    db.add(nueva_incidencia)
    db.commit()
    db.refresh(nueva_incidencia)
    return nueva_incidencia


@router.get("", response_model=List[IncidenciaResponse])
def obtener_incidencias(db: Session = Depends(get_db)):
    """
    URI: GET /api/incidencias
    Devuelve el historial absoluto de todas las incidencias guardadas en el sistema.
    """
    return db.query(Incidencia).all()


@router.get("/trabajador/{id_trabajador}", response_model=List[IncidenciaResponse])
def obtener_incidencias_trabajador(id_trabajador: int, db: Session = Depends(get_db)):
    """
    URI: GET /api/incidencias/trabajador/{id_trabajador}
    Recupera todas las incidencias reportadas por un empleado concreto.
    """
    return db.query(Incidencia).filter(Incidencia.idTrabajador == id_trabajador).all()


@router.put("/{id_incidencia}/resolver", response_model=IncidenciaResponse)
def resolver_incidencia(id_incidencia: int, db: Session = Depends(get_db)):
    """
    URI: PUT /api/incidencias/{id_incidencia}/resolver
    Modifica el estado de una incidencia abierta para marcarla como 'resuelta'.
    """
    incidencia = db.query(Incidencia).filter(Incidencia.id == id_incidencia).first()
    if not incidencia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incidencia ({id_incidencia}) no encontrada."
        )
    
    setattr(incidencia, "estado", "resuelta")
    db.commit()
    db.refresh(incidencia)
    return incidencia
