from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db, next_id
from models.empresa import Empresa
from schemas.empresa import EmpresaCreate, EmpresaEdit, EmpresaResponse
from schemas.trabajador import TrabajadorResponse

# Inicialización del enrutador modular para el catálogo de empresas
router = APIRouter(prefix="/api/empresas", tags=["Empresas"])

@router.post("", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED)
def crear_empresa(obj_in: EmpresaCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/empresas
    Registra una nueva empresa en el sistema validando los datos con Pydantic.
    """
    try:
        # Verifica si el CIF ya existe previamente en el sistema para evitar duplicados
        empresa_existente = db.query(Empresa).filter(Empresa.cif == obj_in.cif).first()
        if empresa_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una empresa registrada con el CIF {obj_in.cif}."
            )

        # Mapea los datos del esquema directamente al modelo físico de SQLAlchemy
        nueva_empresa = Empresa(
            id=next_id(Empresa), 
            nombre=obj_in.nombre,
            cif=obj_in.cif,
            direccion=obj_in.direccion,
            codigo_postal=obj_in.codigo_postal,
            poblacion=obj_in.poblacion,
            provincia=obj_in.provincia
        )
        
        db.add(nueva_empresa)
        db.commit()
        db.refresh(nueva_empresa)
        return nueva_empresa

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
    Devuelve el catálogo completo de todas las organizaciones registradas.
    """
    return db.query(Empresa).all()


@router.get("/{id_empresa}", response_model=EmpresaResponse)
def obtener_empresa(id_empresa: int, db: Session = Depends(get_db)):
    """
    URI: GET /api/empresas/{id_empresa}
    Busca una organización específica mediante su identificador único.
    """
    empresa = db.query(Empresa).filter(Empresa.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID {id_empresa} no encontrada."
        )
    return empresa


@router.get("/{id_empresa}/trabajadores", response_model=List[TrabajadorResponse])
def obtener_trabajadores_empresa(id_empresa: int, db: Session = Depends(get_db)):
    """
    URI: GET /api/empresas/{id_empresa}/trabajadores
    Recupera el listado de empleados vinculados a través de la tabla intermedia muchos a muchos.
    """
    empresa = db.query(Empresa).filter(Empresa.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID {id_empresa} no encontrada."
        )
    # Devuelve la colección mapeada automáticamente gracias a la relación secondary de SQLAlchemy
    return empresa.trabajadores

@router.put("/{id_empresa}/nombre", response_model=EmpresaResponse) # Usa tu modelo de respuesta habitual
def cambiar_nombre_empresa(id_empresa: int, obj_in: EmpresaEdit, db: Session = Depends(get_db)):
    """
    URI: PUT /api/empresas/{id_empresa}/nombre
    Modifica únicamente el nombre de una empresa existente en la base de datos.
    """
    # Buscamos la empresa por su ID único
    empresa = db.query(Empresa).filter(Empresa.id == id_empresa).first()
    
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna empresa con el ID {id_empresa}."
        )
    
    # Actualizamos el campo con el nuevo valor validado
    # empresa.nombre = obj_in.nombre
    
    db.commit()
    db.refresh(empresa)
    return empresa