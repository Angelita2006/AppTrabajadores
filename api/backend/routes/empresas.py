from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from models.usuarios import Usuarios
from schemas.empresas import EmpresaCreate, EmpresaResponse, EmpresaUpdate
from schemas.trabajadores import TrabajadorResponse
import shutil
import os
from fastapi import UploadFile, File

CARPETA_LOGOS = "static/logos" 
os.makedirs(CARPETA_LOGOS, exist_ok=True)

router = APIRouter(prefix="/api/empresas", tags=["Empresas"])

limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")  
def crear_empresa(
    request: Request,
    obj_in: EmpresaCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA]))
):
    """
    URI: POST /api/empresas
    Registra una nueva empresa en el sistema (restringido a administradores de gestoría).
    """
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
    query = db.query(Empresas)
    
    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria:
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
    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != id_empresa:
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
    empresa = db.query(Empresas).filter(Empresas.cif == cif_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con CIF {cif_empresa} no encontrada."
        )

    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != empresa.id:
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
    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los trabajadores de esta empresa."
        )

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
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
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
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
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

@router.put("/{id_empresa}/logo", response_model=EmpresaResponse)
@limiter.limit("20/minute")
async def actualizar_logo_empresa(
    request: Request,
    id_empresa: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado.")

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada.")

    assert file.filename is not None
    extension = file.filename.split(".")[-1]
    nombre_archivo = f"logo_{id_empresa}.{extension}"
    ruta_destino = os.path.join(CARPETA_LOGOS, nombre_archivo)

    # Guardar el archivo físicamente
    with open(ruta_destino, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Guardar SOLO la ruta relativa en la base de datos
    ruta_relativa = f"/static/logos/{nombre_archivo}"

    # Actualizar en base de datos
    empresa.logo_url = ruta_relativa
    empresa.updated_at = datetime.now()

    try:
        db.commit()
        db.refresh(empresa)
        return empresa
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(error))