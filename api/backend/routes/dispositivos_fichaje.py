from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from uuid import UUID
from core.database import get_db
from models.empresas import Empresas
from models.centros_trabajo import CentrosTrabajo
from models.dispositivos_fichaje import DispositivosFichaje
from schemas.dispositivos_fichaje import DispositivoFichajeCreate, DispositivoFichajeResponse

router = APIRouter(prefix="/api/dispositivos", tags=["Dispositivos de Fichaje"])

@router.post("", response_model=DispositivoFichajeResponse, status_code=status.HTTP_201_CREATED)
def registrar_dispositivo(obj_in: DispositivoFichajeCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/dispositivos
    Registra y autoriza un nuevo terminal de fichaje dentro de una empresa y centro de trabajo.
    """
    # 1. Validaciones de seguridad: Verifica la existencia de la empresa
    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
        )

    # 2. Validaciones de seguridad: Si se incluye, verifica que el centro de trabajo exista
    if obj_in.centro_trabajo_id:
        centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == obj_in.centro_trabajo_id).first()
        if not centro:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Centro de trabajo ({obj_in.centro_trabajo_id}) no encontrado."
            )

    # 3. Comprobación de unicidad compuesta (empresa_id + identificador)
    dispositivo_existente = db.query(DispositivosFichaje).filter(
        DispositivosFichaje.empresa_id == obj_in.empresa_id,
        DispositivosFichaje.identificador == obj_in.identificador
    ).first()
    
    if dispositivo_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un dispositivo registrado con este identificador dentro de la misma empresa."
        )

    # 4. Mapeo directo al modelo físico de SQLAlchemy (el ID e hilos temporales los genera la base de datos)
    nuevo_dispositivo = DispositivosFichaje(
        empresa_id=obj_in.empresa_id,
        tipo_dispositivo=obj_in.tipo_dispositivo,
        identificador=obj_in.identificador,
        centro_trabajo_id=obj_in.centro_trabajo_id,
        ubicacion=obj_in.ubicacion
    )
    
    db.add(nuevo_dispositivo)
    db.commit()
    db.refresh(nuevo_dispositivo)
    return nuevo_dispositivo


@router.get("", response_model=List[DispositivoFichajeResponse])
def obtener_todos_los_dispositivos(db: Session = Depends(get_db)):
    """
    URI: GET /api/dispositivos
    Devuelve el listado global de todos los terminales autorizados en la plataforma Saas.
    """
    return db.query(DispositivosFichaje).all()


@router.get("/empresa/{id_empresa}", response_model=List[DispositivoFichajeResponse])
def obtener_dispositivos_empresa(id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/dispositivos/empresa/{id_empresa}
    Recupera de forma aislada el parque de terminales dado de alta por una empresa concreta (tenant).
    """
    return db.query(DispositivosFichaje).filter(DispositivosFichaje.empresa_id == id_empresa).all()


@router.get("/{id_dispositivo}", response_model=DispositivoFichajeResponse)
def obtener_dispositivo(id_dispositivo: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/dispositivos/{id_dispositivo}
    Busca los detalles técnicos de un terminal específico utilizando su ID único UUID.
    """
    dispositivo = db.query(DispositivosFichaje).filter(DispositivosFichaje.id == id_dispositivo).first()
    if not dispositivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispositivo con ID {id_dispositivo} no encontrado."
        )
    return dispositivo


@router.put("/{id_dispositivo}/estado", response_model=DispositivoFichajeResponse)
def cambiar_estado_dispositivo(id_dispositivo: UUID, activo: bool, db: Session = Depends(get_db)):
    """
    URI: PUT /api/dispositivos/{id_dispositivo}/estado?activo=false
    Permite activar o desactivar (dar de baja lógica) un terminal de fichaje.
    """
    dispositivo = db.query(DispositivosFichaje).filter(DispositivosFichaje.id == id_dispositivo).first()
    if not dispositivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispositivo con ID {id_dispositivo} no encontrado."
        )
    
    # Uso seguro de setattr para blindar el tipado contra advertencias de Pylance
    setattr(dispositivo, "activo", activo)
    setattr(dispositivo, "updated_at", datetime.now())
    
    db.commit()
    db.refresh(dispositivo)
    return dispositivo
