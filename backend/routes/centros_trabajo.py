from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.utils import obtener_coordenadas
from core.database import get_db
from core.security import get_db_with_advanced_security, obtener_usuario_actual, verificar_permisos_requeridos
from models.empresas import Empresas
from models.centros_trabajo import CentrosTrabajo
from models.usuarios import Usuarios
from schemas.centros_trabajo import CentroTrabajoCreate, CentroTrabajoResponse, CentroTrabajoUpdate
from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum, AccionPermisoEnum, TipoPermisoEnum

# APIRouter agrupa todos los endpoints relacionados con la gestión de centros de trabajo bajo el prefijo "/api/centros-trabajo".
router = APIRouter(prefix="/api/centros-trabajo", tags=["Centros de Trabajo"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=CentroTrabajoResponse, status_code=status.HTTP_201_CREATED, summary="Crear centro de trabajo")
@limiter.limit("20/minute") 
async def crear_centro_trabajo(
    request: Request,
    payload: CentroTrabajoCreate, 
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR+"-"+TipoPermisoEnum.CENTROS_TRABAJO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **POST /api/centros-trabajo**
    
    Registra una nueva sede física vinculada a una empresa cliente (tenant) validando los datos con Pydantic.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de centro de trabajo desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == payload.empresa_id).first()
    if not empresa:
        print(f"Empresa ({payload.empresa_id}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa no encontrada."
        )

    latitud, longitud = payload.latitud, payload.longitud
    if payload.direccion and (latitud is None or longitud is None):
        latitud, longitud = await obtener_coordenadas(payload.direccion)
    
    try:
        nuevo_centro = CentrosTrabajo(
            empresa_id=payload.empresa_id,
            nombre=payload.nombre,
            zona_horaria=payload.zona_horaria,
            codigo_ccc=payload.codigo_ccc,
            direccion=payload.direccion,
            latitud=latitud,
            longitud=longitud,
            activo=True 
        )
        
        db.add(nuevo_centro)
        db.commit()
        
        centro_creado = (
            db.query(CentrosTrabajo)
            .options(joinedload(CentrosTrabajo.empresa))
            .filter(CentrosTrabajo.id == nuevo_centro.id)
            .first()
        )
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=payload.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "centros_trabajo", "accion": "crear"},
            trabajador_id=None
        )
        
        return centro_creado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear el centro de trabajo: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido crear el centro de trabajo."
        )

@router.put("/{id_centro}", response_model=CentroTrabajoResponse, summary="Modificar centro de trabajo")
@limiter.limit("20/minute") 
async def modificar_centro_trabajo(
    request: Request,
    id_centro: UUID, 
    payload: CentroTrabajoUpdate, 
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR+"-"+TipoPermisoEnum.CENTROS_TRABAJO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/centros-trabajo/{id_centro}/editar**
    
    Permite editar los datos del centro de trabajo y recalcula las coordenadas si es necesario.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación del centro de trabajo ({id_centro}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == id_centro).first()
    if not centro:
        print(f"Centro de trabajo ({id_centro}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo no encontrado."
        )

    try:
        latitud = getattr(payload, "latitud", None)
        longitud = getattr(payload, "longitud", None)

        if payload.direccion and (latitud is None or longitud is None or centro.direccion != payload.direccion):
            latitud, longitud = await obtener_coordenadas(payload.direccion)
        
        if latitud is None:
            latitud = centro.latitud
        if longitud is None:
            longitud = centro.longitud

        setattr(centro, "nombre", payload.nombre)
        setattr(centro, "zona_horaria", payload.zona_horaria)
        setattr(centro, "activo", payload.activo)
        setattr(centro, "codigo_ccc", payload.codigo_ccc)
        setattr(centro, "direccion", payload.direccion)
        setattr(centro, "latitud", latitud)
        setattr(centro, "longitud", longitud)
        setattr(centro, "updated_at", datetime.now())
        
        db.commit()
        
        centro_editado = (
            db.query(CentrosTrabajo)
            .options(joinedload(CentrosTrabajo.empresa))
            .filter(CentrosTrabajo.id == id_centro)
            .first()
        )
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=centro.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "centros_trabajo", "accion": "modificar"},
            trabajador_id=None
        )
        
        return centro_editado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido actualizar el centro de trabajo: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido actualizar el centro de trabajo."
        )

@router.put("/{id_centro}/desactivar", status_code=status.HTTP_200_OK, summary="Desactivar centro de trabajo")
@limiter.limit("20/minute")  
def desactivar_centro_trabajo(
    request: Request,
    id_centro: UUID, 
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.CENTROS_TRABAJO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/centros-trabajo/{id_centro}/desactivar**
    
    Desactivar un centro de trabajo.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de desactivación del centro de trabajo ({id_centro}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == id_centro).first()
    if not centro:
        print(f"Centro de trabajo ({id_centro}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo no encontrado."
        )

    centro.activo = False
    centro.updated_at = datetime.now()

    try:
        db.commit()
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=centro.empresa_id,
            accion=AccionAuditoriaEnum.ELIMINACION,
            detalle={"recurso": "centros_trabajo", "accion": "desactivar"},
            trabajador_id=None
        )

        print(f"Centro de trabajo ({id_centro}) desactivado correctamente y enviado a la papelera.")
        return {"detail": f"Centro de trabajo desactivado correctamente y enviado a la papelera."}
    except Exception as e:
        db.rollback()
        print(f"No se ha podido desactivar el centro de trabajo: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido desactivar el centro de trabajo: {str(e)}."
        )

@router.get("/empresa/{id_empresa}", response_model=List[CentroTrabajoResponse], summary="Obtener centros de trabajo por empresa")
@limiter.limit("60/minute")  
def obtener_centros_trabajo_empresa(
    request: Request,
    id_empresa: UUID, 
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.CENTROS_TRABAJO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/centros-trabajo/empresa/{id_empresa}**
    
    Obtiene los centros de trabajo de la empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de centros de trabajo para la empresa ({id_empresa}) desde la IP ){cliente_ip} por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    centros = (
        db.query(CentrosTrabajo)
        .options(joinedload(CentrosTrabajo.empresa))
        .filter(CentrosTrabajo.empresa_id == id_empresa, CentrosTrabajo.activo.is_(True))
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "centros_trabajo", "accion": "consultar_empresa"},
        trabajador_id=None
    )

    return centros


@router.get("/{id_centro}", response_model=CentroTrabajoResponse, summary="Obtener centro de trabajo por id")
@limiter.limit("60/minute")  
def obtener_centro_trabajo_id(
    request: Request,
    id_centro: UUID, 
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.CENTROS_TRABAJO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/centros-trabajo/{id_centro}**
    
    Obtiene los datos de un centro de trabajo por su id.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta del centro de trabajo ({id_centro}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    centro = (
        db.query(CentrosTrabajo)
        .options(joinedload(CentrosTrabajo.empresa))
        .filter(CentrosTrabajo.id == id_centro)
        .first()
    )
    if not centro:
        print(f"Centro de trabajo ({id_centro}) no encontrado.")

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo no encontrado."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=centro.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "centros_trabajo", "accion": "consultar"},
        trabajador_id=None
    )

    return centro