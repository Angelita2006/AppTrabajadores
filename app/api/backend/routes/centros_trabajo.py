from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from uuid import UUID
from core.database import get_db
from empresas import Empresas
from centros_trabajo import CentrosTrabajo
from schemas.centros_trabajo import CentroTrabajoCreate, CentroTrabajoResponse

router = APIRouter(prefix="/api/centros-trabajo", tags=["Centros de Trabajo"])

@router.post("", response_model=CentroTrabajoResponse, status_code=status.HTTP_201_CREATED)
def crear_centro_trabajo(obj_in: CentroTrabajoCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/centros-trabajo
    Registra una nueva sede física vinculada a una empresa cliente (tenant) validando los datos con Pydantic.
    """
    try:
        # 1. Validación de seguridad: Verifica que la empresa exista
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
            )

        # 2. Mapea los datos del esquema directamente al modelo físico de SQLAlchemy
        nuevo_centro = CentrosTrabajo(
            empresa_id=obj_in.empresa_id,
            nombre=obj_in.nombre,
            zona_horaria=obj_in.zona_horaria,
            codigo_ccc=obj_in.codigo_ccc,
            direccion=obj_in.direccion,
            activo=True  # Inicialización activa por defecto
        )
        
        db.add(nuevo_centro)
        db.commit()
        db.refresh(nuevo_centro)
        return nuevo_centro

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al crear el centro de trabajo: {str(error)}"
        )


@router.get("", response_model=List[CentroTrabajoResponse])
def obtener_todos_los_centros(db: Session = Depends(get_db)):
    """
    URI: GET /api/centros-trabajo
    Devuelve el catálogo de todos los centros de trabajo de la plataforma Saas para auditorías globales.
    """
    return db.query(CentrosTrabajo).all()


@router.get("/empresa/{id_empresa}", response_model=List[CentroTrabajoResponse])
def obtener_centros_empresa(id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/centros-trabajo/empresa/{id_empresa}
    Recupera de forma aislada las sedes físicas dadas de alta por una organización concreta (tenant).
    """
    return db.query(CentrosTrabajo).filter(CentrosTrabajo.empresa_id == id_empresa).all()


@router.get("/{id_centro}", response_model=CentroTrabajoResponse)
def obtener_centro_trabajo(id_centro: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/centros-trabajo/{id_centro}
    Busca la información de una sede mediante su identificador único UUID.
    """
    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == id_centro).first()
    if not centro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo con ID {id_centro} no encontrado."
        )
    return centro


@router.put("/{id_centro}/estado", response_model=CentroTrabajoResponse)
def cambiar_estado_centro(id_centro: UUID, activo: bool, db: Session = Depends(get_db)):
    """
    URI: PUT /api/centros-trabajo/{id_centro}/estado?activo=false
    Permite activar o desactivar (dar de baja lógica) una sede sin destruir los registros históricos.
    """
    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == id_centro).first()
    if not centro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo con ID {id_centro} no encontrado."
        )
    
    # Modificación segura utilizando setattr para eludir advertencias estrictas de tipo en Pylance
    setattr(centro, "activo", activo)
    setattr(centro, "updated_at", datetime.now())
    
    db.commit()
    db.refresh(centro)
    return centro
