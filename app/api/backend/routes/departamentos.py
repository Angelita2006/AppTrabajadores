from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from uuid import UUID
from core.database import get_db
from models.empresas import Empresas
from models.centros_trabajo import CentrosTrabajo
from models.departamentos import Departamentos
from schemas.departamentos import DepartamentoCreate, DepartamentoResponse

router = APIRouter(prefix="/api/departamentos", tags=["Departamentos"])

@router.post("", response_model=DepartamentoResponse, status_code=status.HTTP_201_CREATED)
def crear_departamento(obj_in: DepartamentoCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/departamentos
    Registra un nuevo departamento dentro de una empresa cliente (tenant).
    """
    try:
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

        # 3. Mapeo directo al modelo físico de la base de datos (el ID e hilos temporales los genera el motor)
        nuevo_departamento = Departamentos(
            empresa_id=obj_in.empresa_id,
            nombre=obj_in.nombre,
            centro_trabajo_id=obj_in.centro_trabajo_id
        )
        
        db.add(nuevo_departamento)
        db.commit()
        db.refresh(nuevo_departamento)
        return nuevo_departamento

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al crear el departamento: {str(error)}"
        )


@router.get("", response_model=List[DepartamentoResponse])
def obtener_todos_los_departamentos(db: Session = Depends(get_db)):
    """
    URI: GET /api/departamentos
    Devuelve la estructura de departamentos global absoluta del sistema Saas.
    """
    return db.query(Departamentos).all()


@router.get("/empresa/{id_empresa}", response_model=List[DepartamentoResponse])
def obtener_departamentos_empresa(id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/departamentos/empresa/{id_empresa}
    Recupera de forma estrictamente aislada los departamentos dados de alta por una organización (tenant).
    """
    return db.query(Departamentos).filter(Departamentos.empresa_id == id_empresa).all()


@router.get("/{id_departamento}", response_model=DepartamentoResponse)
def obtener_departamento(id_departamento: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/departamentos/{id_departamento}
    Busca la información de un departamento mediante su identificador único UUID.
    """
    departamento = db.query(Departamentos).filter(Departamentos.id == id_departamento).first()
    if not departamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Departamento con ID {id_departamento} no encontrado."
        )
    return departamento


@router.put("/{id_departamento}", response_model=DepartamentoResponse)
def actualizar_departamento(id_departamento: UUID, nuevo_nombre: str, db: Session = Depends(get_db)):
    """
    URI: PUT /api/departamentos/{id_departamento}
    Modifica el nombre de un departamento existente actualizando la marca de tiempo de auditoría.
    """
    departamento = db.query(Departamentos).filter(Departamentos.id == id_departamento).first()
    if not departamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Departamento con ID {id_departamento} no encontrado."
        )
    
    # Modificación segura utilizando setattr para eludir advertencias estrictas de tipo en Pylance
    setattr(departamento, "nombre", nuevo_nombre)
    setattr(departamento, "updated_at", datetime.now())
    
    db.commit()
    db.refresh(departamento)
    return departamento
