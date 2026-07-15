import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from models.ausencias import Ausencias
from core.database import get_db
from models.empresas import Empresas
from models.enums import EstadoAusenciaEnum
from schemas.ausencias import AusenciaCreate, AusenciaResponse
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios

# Inicialización del enrutador modular para el control de vacaciones, bajas y permisos
router = APIRouter(prefix="/api/ausencias", tags=["Control de Ausencias y Bajas"])

@router.post("", response_model=AusenciaResponse, status_code=status.HTTP_201_CREATED)
def solicitar_ausencia(obj_in: AusenciaCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/ausencias
    Registra una nueva solicitud de ausencia (vacaciones, baja, etc.) en estado 'pendiente' por defecto.
    """
    # 1. Validaciones estructurales de aislamiento de datos (Tenant)
    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada.")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    # 2. Creación del registro físico en la base de datos
    nueva_ausencia = Ausencias(
        empresa_id=obj_in.empresa_id,
        trabajador_id=obj_in.trabajador_id,
        tipo_ausencia=obj_in.tipo_ausencia,
        fecha_inicio=obj_in.fecha_inicio,
        fecha_fin=obj_in.fecha_fin,
        motivo=obj_in.motivo,
        justificante_metadata=obj_in.justificante_metadata,
        estado=EstadoAusenciaEnum.PENDIENTE
    )

    try:
        db.add(nueva_ausencia)
        db.commit()
        db.refresh(nueva_ausencia)
        return nueva_ausencia
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error de integridad al procesar la solicitud: {str(error)}"
        )


@router.get("", response_model=List[AusenciaResponse])
def obtener_todas_las_ausencias(db: Session = Depends(get_db)):
    """
    URI: GET /api/ausencias
    Lista el histórico completo de ausencias y bajas del Saas para la gestoría.
    """
    return db.query(Ausencias).all()


@router.get("/empresa/{id_empresa}", response_model=List[AusenciaResponse])
def obtener_ausencias_por_empresa(id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/ausencias/empresa/{id_empresa}
    Filtra las solicitudes dentro de una empresa cliente para el panel de recursos humanos.
    """
    return db.query(Ausencias).filter(Ausencias.empresa_id == id_empresa).all()


@router.get("/trabajador/{id_trabajador}", response_model=List[AusenciaResponse])
def obtener_ausencias_por_trabajador(id_trabajador: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/ausencias/trabajador/{id_trabajador}
    Permite al operario consultar el estado de sus bajas o vacaciones desde la app móvil.
    """
    return db.query(Ausencias).filter(Ausencias.trabajador_id == id_trabajador).all()


@router.put("/{id_ausencia}/resolver", response_model=AusenciaResponse)
def resolver_solicitud_ausencia(
    id_ausencia: UUID, 
    nuevo_estado: EstadoAusenciaEnum, 
    resolutor_usuario_id: UUID, 
    observaciones: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    URI: PUT /api/ausencias/{id_ausencia}/resolver?nuevo_estado=aprobada&resolutor_usuario_id=UUID
    Tramita la resolución (aprobación/rechazo) de un periodo de ausencia por parte de administración.
    """
    ausencia = db.query(Ausencias).filter(Ausencias.id == id_ausencia).first()
    if not ausencia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud de ausencia no localizada.")

    # Impide modificar una solicitud que ya fue procesada previamente
    if ausencia.estado != EstadoAusenciaEnum.PENDIENTE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta solicitud ya ha sido resuelta previamente.")

    resolutor = db.query(Usuarios).filter(Usuarios.id == resolutor_usuario_id).first()
    if not resolutor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario validador no encontrado.")

    if nuevo_estado == EstadoAusenciaEnum.PENDIENTE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede devolver una solicitud al estado pendiente.")

    # Inyección segura de los parámetros de resolución mediante setattr para silenciar a Pylance
    setattr(ausencia, "estado", nuevo_estado)
    setattr(ausencia, "validado_por_usuario_id", resolutor_usuario_id)
    setattr(ausencia, "observaciones_admin", observaciones)
    setattr(ausencia, "fecha_resolucion", datetime.datetime.now())
    setattr(ausencia, "updated_at", datetime.datetime.now())

    db.commit()
    db.refresh(ausencia)
    return ausencia

@router.put("/{id_ausencia}/estado", response_model=AusenciaResponse)
def actualizar_estado_ausencia(
    id_ausencia: UUID, 
    nuevo_estado: str,  
    db: Session = Depends(get_db)
):
    """
    URI: PUT /api/ausencias/{id_ausencia}/estado?nuevo_estado=aprobado
    Modifica el estado de una solicitud de ausencia (aprobar o rechazar).
    """
    # 1. Buscar la ausencia por su ID único
    ausencia = db.query(Ausencias).filter(Ausencias.id == id_ausencia).first()
    
    if not ausencia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ninguna solicitud de ausencia con el ID {id_ausencia}."
        )

    # 2. Actualizar el campo de estado de forma dinámica
    setattr(ausencia, "estado", nuevo_estado)
    
    try:
        db.commit()
        db.refresh(ausencia)
        return ausencia
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el estado de la ausencia: {str(error)}"
        )