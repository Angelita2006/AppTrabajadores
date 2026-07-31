from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.database import get_db
from core.security import obtener_usuario_actual
from models.empresas import Empresas
from models.usuarios import Usuarios
from schemas.empresas import EmpresaCreate, EmpresaResponse, EmpresaUpdate
from schemas.trabajadores import TrabajadorResponse

router = APIRouter(prefix="/api/empresas", tags=["Empresas"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")  # Protegido frente a registros masivos o automatizados de nuevos tenants
def crear_empresa(
    request: Request,
    obj_in: EmpresaCreate, 
    db: Session = Depends(get_db),
    # usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/empresas
    Registra una nueva empresa cliente (tenant) en el sistema validando los datos con Pydantic.
    """
    # if usuario_actual.tipo_usuario != "Administrador":
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="No tienes permisos de Administrador para crear nuevas empresas."
    #     )

    try:
        empresa_existente = db.query(Empresas).filter(Empresas.cif == obj_in.cif).first()
        if empresa_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una empresa registrada con el CIF {obj_in.cif}."
            )

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
def obtener_empresas(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/empresas
    Devuelve el catálogo de organizaciones aplicando aislamiento multi-tenant.
    """
    query = db.query(Empresas)
    
    if usuario_actual.tipo_usuario != "Administrador":
        if not usuario_actual.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No estás vinculado a ninguna empresa."
            )
        query = query.filter(Empresas.id == usuario_actual.empresa_id)

    return query.order_by(Empresas.nombre_comercial.asc()).all()


@router.get("/{id_empresa}", response_model=EmpresaResponse)
def obtener_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/empresas/{id_empresa}
    Busca una organización específica mediante su identificador único UUID.
    """
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los datos de esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID {id_empresa} no encontrada."
        )
    return empresa


@router.get("/cif/{cif_empresa}", response_model=EmpresaResponse)
def obtener_empresa_por_cif(
    cif_empresa: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/empresas/cif/{cif_empresa}
    Busca una organización específica mediante su cif.
    """
    empresa = db.query(Empresas).filter(Empresas.cif == cif_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con CIF {cif_empresa} no encontrada."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != empresa.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar esta empresa."
        )

    return empresa


@router.get("/{id_empresa}/trabajadores", response_model=List[TrabajadorResponse])
def obtener_trabajadores_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
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
    return sorted(empresa.trabajadores, key=lambda t: t.nombre)


@router.put("/{id_empresa}/razon-social", response_model=EmpresaResponse)
def cambiar_razon_social_empresa(
    id_empresa: UUID, 
    nueva_razon_social: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: PUT /api/empresas/{id_empresa}/razon-social
    Modifica la razón social de una empresa existente actualizando la marca temporal de auditoría.
    """
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar la razón social de esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna empresa con el ID {id_empresa}."
        )
    
    setattr(empresa, "razon_social", nueva_razon_social)
    setattr(empresa, "updated_at", datetime.now())
    
    db.commit()
    db.refresh(empresa)
    return empresa


@router.put("/{id_empresa}", response_model=EmpresaResponse)
def actualizar_datos_empresa(
    id_empresa: UUID, 
    payload: EmpresaUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: PUT /api/empresas/{id_empresa}
    Actualiza los datos modificados de una empresa específica utilizando su UUID.
    """
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para actualizar los datos de esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna empresa con el ID {id_empresa}."
        )
    
    # Actualiza dinámicamente solo los campos proporcionados en el payload
    datos_actualizacion = payload.model_dump(exclude_unset=True)
    for key, value in datos_actualizacion.items():
        setattr(empresa, key, value)

    setattr(empresa, "updated_at", datetime.now())
    
    try:
        db.commit()
        db.refresh(empresa)
        return empresa
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar los datos de la empresa: {str(error)}"
        )