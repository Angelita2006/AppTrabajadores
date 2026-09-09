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

# APIRouter agrupa todos los endpoints relacionados con la gestión de empresas bajo el prefijo "/api/empresas".
router = APIRouter(prefix="/api/empresas", tags=["Empresas"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
# Esto previene ataques de fuerza bruta o saturación de peticiones en rutas críticas.
limiter = Limiter(key_func=get_remote_address)

CARPETA_LOGOS = "static/logos" 
os.makedirs(CARPETA_LOGOS, exist_ok=True)

@router.post("", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED, summary="Crear empresa")
@limiter.limit("10/minute")  # Limita este endpoint a un máximo de 10 peticiones por minuto por IP para evitar abusos.
def crear_empresa(
    request: Request,
    obj_in: EmpresaCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA]))
):
    """
    **POST /api/empresas**
    
    Registra una nueva empresa en el sistema (restringido a administradores de gestoría).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de empresa desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    try:
        empresa_existente = db.query(Empresas).filter(Empresas.cif == obj_in.cif).first()
        if empresa_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una empresa registrada con el CIF ({obj_in.cif})."
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


@router.put("/{id_empresa}/razon-social", response_model=EmpresaResponse, summary="Cambiar razón social de empresa")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def cambiar_razon_social_empresa(
    request: Request,
    id_empresa: UUID, 
    nueva_razon_social: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **PUT /api/empresas/{id_empresa}/razon-social**
    
    Modifica la razón social de una empresa existente.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de cambio de razón social para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para modificar la razón social de esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna empresa con el ID ({id_empresa})."
        )
    
    setattr(empresa, "razon_social", nueva_razon_social)
    setattr(empresa, "updated_at", datetime.now())
    
    try:
        db.commit()
        db.refresh(empresa)
        return empresa
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar la razón social de la empresa: {str(error)}"
        )


@router.put("/{id_empresa}", response_model=EmpresaResponse, summary="Actualizar datos de empresa")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def actualizar_datos_empresa(
    request: Request,
    id_empresa: UUID, 
    payload: EmpresaUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **PUT /api/empresas/{id_empresa}**
    
    Actualiza los datos generales de una empresa en el sistema.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de actualización de datos para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para actualizar los datos de esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna empresa con el ID ({id_empresa})."
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

@router.put("/{id_empresa}/logo", response_model=EmpresaResponse, summary="Actualizar logo de empresa")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
async def actualizar_logo_empresa(
    request: Request,
    id_empresa: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **PUT /api/empresas/{id_empresa}/logo**
    
    Sube y actualiza el logotipo oficial de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de actualización de logo para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No autorizado para modificar el logo de esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID ({id_empresa}) no encontrada."
        )

    assert file.filename is not None

    TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/jpg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"]
    
    if file.content_type not in TIPOS_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El archivo seleccionado no es una imagen válida (solo se permiten formatos JPEG, PNG, WEBP o ICO)."
        )

    extension = file.filename.split(".")[-1].lower()
    if extension not in ["png", "jpg", "jpeg", "webp", "ico", "svg"]:
        extension = "png"

    nombre_archivo = f"logo_{id_empresa}.{extension}"
    ruta_destino = os.path.join(CARPETA_LOGOS, nombre_archivo)

    with open(ruta_destino, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    ruta_relativa = f"/static/logos/{nombre_archivo}"

    empresa.logo_url = ruta_relativa
    empresa.updated_at = datetime.now()

    try:
        db.commit()
        db.refresh(empresa)
        return empresa
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al guardar el logo de la empresa: {str(error)}"
        )

@router.get("", response_model=List[EmpresaResponse], summary="Obtener lista de empresas")
@limiter.limit("60/minute")  # Limita las consultas masivas de listados de empresas para proteger el rendimiento
def obtener_empresas(
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/empresas**
    
    Devuelve el catálogo de organizaciones aplicando aislamiento multi-tenant.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de empresas desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    query = db.query(Empresas)
    
    if usuario_actual.tipo_usuario != "Administrador":
        if not usuario_actual.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No estás vinculado a ninguna empresa."
            )
        query = query.filter(Empresas.id == usuario_actual.empresa_id)

    return query.order_by(Empresas.nombre_comercial.asc()).all()


@router.get("/{id_empresa}", response_model=EmpresaResponse, summary="Obtener empresa por ID")
@limiter.limit("60/minute")  # Limita las consultas individuales de detalles de empresa
def obtener_empresa(
    request: Request,
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/empresas/{id_empresa}**
    
    Obtiene los detalles completos de una empresa a partir de su ID único universal.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle de la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes autorización para consultar los datos de esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID ({id_empresa}) no encontrada."
        )
    return empresa


@router.get("/cif/{cif_empresa}", response_model=EmpresaResponse, summary="Obtener empresa por CIF")
@limiter.limit("60/minute")  # Limita las consultas de empresa por CIF
def obtener_empresa_por_cif(
    request: Request,
    cif_empresa: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/empresas/cif/{cif_empresa}**
    
    Busca y devuelve los datos de una empresa filtrando directamente por su código CIF.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de empresa por CIF {cif_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    empresa = db.query(Empresas).filter(Empresas.cif == cif_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con CIF ({cif_empresa}) no encontrada."
        )

    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != empresa.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes autorización para consultar esta empresa."
        )

    return empresa


@router.get("/{id_empresa}/trabajadores", response_model=List[TrabajadorResponse], summary="Obtener trabajadores de empresa")
@limiter.limit("60/minute")  # Limita las consultas de listados de trabajadores asociados a una empresa
def obtener_trabajadores_empresa(
    request: Request,
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/empresas/{id_empresa}/trabajadores**
    
    Devuelve la lista de trabajadores vinculados a una empresa específica.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de trabajadores para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes autorización para consultar los trabajadores de esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID ({id_empresa}) no encontrada."
        )
    return sorted(empresa.trabajadores, key=lambda t: t.nombre)