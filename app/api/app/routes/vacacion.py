from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db, next_id
from app.models.empresa import Empresa
from app.models.vacacion import Vacacion
from app.models.trabajador import Trabajador
from app.schemas.vacacion import VacacionCreate, VacacionResponse

# Inicialización del enrutador modular para el control de vacaciones
router = APIRouter(prefix="/api/vacaciones", tags=["Vacaciones"])


@router.post("", response_model=VacacionResponse, status_code=status.HTTP_201_CREATED)
def crear_solicitud_vacacion(obj_in: VacacionCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/vacaciones
    Registra una nueva solicitud de vacaciones en el sistema con estado 'pendiente' por defecto.
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

    # 3. Mapeo y almacenamiento de la solicitud
    nueva_solicitud = Vacacion(
        id=next_id(Vacacion),
        idTrabajador=obj_in.idTrabajador,
        idEmpresa=obj_in.idEmpresa,
        fechaInicio=obj_in.fechaInicio,   # Recibe cadena de texto "AAAA-MM-DD"
        fechaFin=obj_in.fechaFin,         # Recibe cadena de texto "AAAA-MM-DD"
        motivo=obj_in.motivo,
        estado="pendiente"                # Fuerza el estado inicial reglamentario
    )
    
    db.add(nueva_solicitud)
    db.commit()
    db.refresh(nueva_solicitud)
    return nueva_solicitud


@router.get("", response_model=List[VacacionResponse])
def obtener_todas_las_vacaciones(db: Session = Depends(get_db)):
    """
    URI: GET /api/vacaciones
    Devuelve el registro histórico global de todas las solicitudes del sistema.
    """
    return db.query(Vacacion).all()


@router.get("/trabajador/{id_trabajador}", response_model=List[VacacionResponse])
def obtener_vacaciones_trabajador(id_trabajador: int, db: Session = Depends(get_db)):
    """
    URI: GET /api/vacaciones/trabajador/{id_trabajador}
    Recupera el historial exclusivo de periodos solicitados por un empleado concreto.
    """
    return db.query(Vacacion).filter(Vacacion.idTrabajador == id_trabajador).all()


@router.put("/{id_vacacion}/responder", response_model=VacacionResponse)
def responder_solicitud_vacacion(id_vacacion: int, nuevo_estado: str, db: Session = Depends(get_db)):
    """
    URI: PUT /api/vacaciones/{id_vacacion}/responder?nuevo_estado=aprobada
    Modifica el estado de una solicitud para tramitarla como 'aprobada' o 'rechazada'.
    """
    solicitud = db.query(Vacacion).filter(Vacacion.id == id_vacacion).first()
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solicitud de vacación ({id_vacacion}) no encontrada."
        )
    
    # Validación del parámetro de entrada
    if nuevo_estado not in ["aprobada", "rechazada", "pendiente"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El estado proporcionado no es válido. Usa 'aprobada' o 'rechazada'."
        )
    
    # Usamos setattr para modificar el valor de forma limpia sin generar avisos de Pylance
    setattr(solicitud, "estado", nuevo_estado)
    db.commit()
    db.refresh(solicitud)
    return solicitud
