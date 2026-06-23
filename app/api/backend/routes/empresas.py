from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from uuid import UUID
from core.database import get_db
from models.empresas import Empresas
from schemas.empresas import EmpresaCreate, EmpresaResponse
from schemas.trabajadores import TrabajadorResponse

router = APIRouter(prefix="/api/empresas", tags=["Empresas"])

@router.post("", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED)
def crear_empresa(obj_in: EmpresaCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/empresas
    Registra una nueva empresa cliente (tenant) en el sistema validando los datos con Pydantic.
    """
    try:
        # Verifica si el CIF ya existe previamente en el sistema para evitar duplicados
        empresa_existente = db.query(Empresas).filter(Empresas.cif == obj_in.cif).first()
        if empresa_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una empresa registrada con el CIF {obj_in.cif}."
            )

        # Mapea los datos del esquema directamente al modelo físico de la base de datos
        nueva_empresa = Empresas(
            razon_social=obj_in.razon_social,
            cif=obj_in.cif,
            zona_horaria=obj_in.zona_horaria,
            configuracion=obj_in.configuracion,
            nombre_comercial=obj_in.nombre_comercial,
            codigo_cnae=obj_in.codigo_cnae,
            convenio_colectivo=obj_in.convenio_colectivo,
            direccion_fiscal=obj_in.direccion_fiscal
        )
        
        db.add(nueva_empresa)
        db.commit()
        db.refresh(nueva_empresa)
        return nueva_empresa

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al crear la empresa: {str(error)}"
        )


@router.get("", response_model=List[EmpresaResponse])
def obtener_empresas(db: Session = Depends(get_db)):
    """
    URI: GET /api/empresas
    Devuelve el catálogo completo de todas las organizaciones dadas de alta en el sistema.
    """
    return db.query(Empresas).order_by(Empresas.nombre_comercial.asc()).all()


@router.get("/{id_empresa}", response_model=EmpresaResponse)
def obtener_empresa(id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/empresas/{id_empresa}
    Busca una organización específica mediante su identificador único UUID.
    """
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID {id_empresa} no encontrada."
        )
    return empresa


@router.get("/{id_empresa}/trabajadores", response_model=List[TrabajadorResponse])
def obtener_trabajadores_empresa(id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/empresas/{id_empresa}/trabajadores
    Recupera la plantilla completa de empleados vinculados a la organización.
    """
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID {id_empresa} no encontrada."
        )
    # Devuelve la colección mapeada y ordenada por nombre
    return sorted(empresa.trabajadores, key=lambda t: t.nombre)


@router.put("/{id_empresa}/razon-social", response_model=EmpresaResponse)
def cambiar_razon_social_empresa(id_empresa: UUID, nueva_razon_social: str, db: Session = Depends(get_db)):
    """
    URI: PUT /api/empresas/{id_empresa}/razon-social
    Modifica la razón social de una empresa existente actualizando la marca temporal de auditoría.
    """
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna empresa con el ID {id_empresa}."
        )
    
    # Modificación segura utilizando setattr para eludir avisos estrictos de tipo en el editor
    setattr(empresa, "razon_social", nueva_razon_social)
    setattr(empresa, "updated_at", datetime.now())
    
    db.commit()
    db.refresh(empresa)
    return empresa
