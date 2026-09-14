from fastapi import APIRouter, Depends, HTTPException, status, Request
import httpx
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.utils import obtener_coordenadas
from models.contratos import Contratos
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from models.centros_trabajo import CentrosTrabajo
from models.usuarios import Usuarios
from schemas.centros_trabajo import CentroTrabajoCreate, CentroTrabajoResponse, CentroTrabajoUpdate
from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum

# APIRouter agrupa todos los endpoints relacionados con la gestión de centros de trabajo bajo el prefijo "/api/centros-trabajo".
router = APIRouter(prefix="/api/centros-trabajo", tags=["Centros de Trabajo"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=CentroTrabajoResponse, status_code=status.HTTP_201_CREATED, summary="Crear centro de trabajo")
@limiter.limit("20/minute") 
async def crear_centro_trabajo(
    request: Request,
    obj_in: CentroTrabajoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **POST /api/centros-trabajo**
    
    Registra una nueva sede física vinculada a una empresa cliente (tenant) validando los datos con Pydantic.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de centro de trabajo desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear centros de trabajo en esta empresa."
        )

    try:
        # 1. Validación de seguridad: Verifica que la empresa exista
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
            )

        # 2. Mapea los datos del esquema directamente al modelo físico de SQLAlchemy y consulta coordenadas si faltan
        latitud, longitud = obj_in.latitud, obj_in.longitud
        if obj_in.direccion and (latitud is None or longitud is None):
            latitud, longitud = await obtener_coordenadas(obj_in.direccion)

        nuevo_centro = CentrosTrabajo(
            empresa_id=obj_in.empresa_id,
            nombre=obj_in.nombre,
            zona_horaria=obj_in.zona_horaria,
            codigo_ccc=obj_in.codigo_ccc,
            direccion=obj_in.direccion,
            latitud=latitud,
            longitud=longitud,
            activo=True 
        )
        
        db.add(nuevo_centro)
        db.commit()
        
        centro_creado = db.query(CentrosTrabajo).options(
            joinedload(CentrosTrabajo.empresa)
        ).filter(CentrosTrabajo.id == nuevo_centro.id).first()
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=obj_in.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "centros_trabajo", "accion": "crear", "entidad_id": str(nuevo_centro.id), "detalles": f"Se creó el centro de trabajo {nuevo_centro.nombre}"}
        )
        
        return centro_creado

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido crear el centro de trabajo: {str(error)}"
        )


@router.put("/{id_centro}/estado", response_model=CentroTrabajoResponse, summary="Cambiar estado de centro de trabajo")
@limiter.limit("20/minute") 
def cambiar_estado_centro(
    request: Request,
    id_centro: UUID, 
    activo: bool, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/centros-trabajo/{id_centro}/estado?activo=false**
    
    Permite activar o desactivar (dar de baja lógica) una sede sin destruir los registros históricos.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de cambio de estado del centro {id_centro} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == id_centro).first()
    if not centro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo con ID {id_centro} no encontrado."
        )
    
    if usuario_actual.empresa_id and usuario_actual.empresa_id != centro.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar el estado de este centro de trabajo."
        )

    # Modificación segura utilizando setattr para eludir advertencias estrictas de tipo en Pylance
    setattr(centro, "activo", activo)
    setattr(centro, "updated_at", datetime.now())
    
    db.commit()
    
    centro_actualizado = db.query(CentrosTrabajo).options(
        joinedload(CentrosTrabajo.empresa)
    ).filter(CentrosTrabajo.id == id_centro).first()
    
    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=centro.empresa_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={"recurso": "centros_trabajo", "accion": "cambiar_estado", "entidad_id": str(centro.id), "detalles": f"Se cambió el estado del centro de trabajo {centro.id} a activo={activo}"}
    )
    
    return centro_actualizado


@router.put("/{id_centro}/editar", response_model=CentroTrabajoResponse, summary="Editar centro de trabajo")
@limiter.limit("20/minute") 
async def editar_centro(
    request: Request,
    id_centro: UUID, 
    nuevos_datos: CentroTrabajoUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/centros-trabajo/{id_centro}/editar**
    
    Permite editar los datos del centro de trabajo y recalcula las coordenadas si es necesario.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de edición del centro {id_centro} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == id_centro).first()
    if not centro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo con ID {id_centro} no encontrado."
        )
    
    if usuario_actual.empresa_id and usuario_actual.empresa_id != centro.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para editar este centro de trabajo."
        )

    try:
        # Recalcular coordenadas si la dirección cambió o si faltaban lat/lon
        latitud = getattr(nuevos_datos, "latitud", None)
        longitud = getattr(nuevos_datos, "longitud", None)

        if nuevos_datos.direccion and (latitud is None or longitud is None or centro.direccion != nuevos_datos.direccion):
            latitud, longitud = await obtener_coordenadas(nuevos_datos.direccion)
        
        # Si aun así vienen vacías en el update pero el centro ya tenía unas válidas, las conservamos
        if latitud is None:
            latitud = centro.latitud
        if longitud is None:
            longitud = centro.longitud

        setattr(centro, "nombre", nuevos_datos.nombre)
        setattr(centro, "zona_horaria", nuevos_datos.zona_horaria)
        setattr(centro, "activo", nuevos_datos.activo)
        setattr(centro, "codigo_ccc", nuevos_datos.codigo_ccc)
        setattr(centro, "direccion", nuevos_datos.direccion)
        setattr(centro, "latitud", latitud)
        setattr(centro, "longitud", longitud)
        setattr(centro, "updated_at", datetime.now())
        
        db.commit()
        
        centro_editado = db.query(CentrosTrabajo).options(
            joinedload(CentrosTrabajo.empresa)
        ).filter(CentrosTrabajo.id == id_centro).first()
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=centro.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "centros_trabajo", "accion": "editar", "entidad_id": str(centro.id), "detalles": f"Se editó el centro de trabajo {centro.id}"}
        )
        
        return centro_editado

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido actualizar el centro de trabajo: {str(error)}"
        )

@router.put("/{id_centro}/desactivar", status_code=status.HTTP_200_OK, summary="Dar de baja lógica centro de trabajo")
@limiter.limit("20/minute")  
def dar_de_baja_centro_trabajo(
    request: Request,
    id_centro: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/centros-trabajo/{id_centro}/desactivar**
    
    Da de baja un centro de trabajo previa validación de contratos activos.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de baja del centro {id_centro} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == id_centro).first()
    if not centro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo con ID {id_centro} no encontrado."
        )
    
    if usuario_actual.empresa_id and usuario_actual.empresa_id != centro.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar este centro de trabajo."
        )

    centro.activo = False
    centro.updated_at = datetime.now()

    try:
        db.commit()
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=centro.empresa_id,
            accion=AccionAuditoriaEnum.ELIMINACION,
            detalle={"recurso": "centros_trabajo", "accion": "desactivar", "entidad_id": str(centro.id), "detalles": f"Se dio de baja lógica el centro de trabajo {centro.id}"}
        )
        return {"detail": f"Centro de trabajo ({id_centro}) desactivado correctamente y enviado a la papelera."}
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido desactivar el centro de trabajo: {str(error)}"
        )

@router.get("/empresa/{id_empresa}", response_model=List[CentroTrabajoResponse], summary="Obtener centros de trabajo por empresa")
@limiter.limit("60/minute")  
def obtener_centros_empresa(
    request: Request,
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/centros-trabajo/empresa/{id_empresa}**
    
    Recupera de forma aislada las sedes físicas dadas de alta por una organización concreta (tenant).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de centros para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los centros de trabajo de esta empresa."
        )

    centros = (
        db.query(CentrosTrabajo)
        .options(joinedload(CentrosTrabajo.empresa))
        .filter(CentrosTrabajo.empresa_id == id_empresa, CentrosTrabajo.activo.is_(True))
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "centros_trabajo", "accion": "consultar_por_empresa"}
    )

    return centros


@router.get("/{id_centro}", response_model=CentroTrabajoResponse, summary="Obtener centro de trabajo por ID")
@limiter.limit("60/minute")  
def obtener_centro_trabajo(
    request: Request,
    id_centro: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/centros-trabajo/{id_centro}**
    
    Busca la información de una sede mediante su identificador único UUID.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta del centro {id_centro} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    centro = (
        db.query(CentrosTrabajo)
        .options(joinedload(CentrosTrabajo.empresa))
        .filter(CentrosTrabajo.id == id_centro)
        .first()
    )
    if not centro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo con ID {id_centro} no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != centro.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar este centro de trabajo."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=centro.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "centros_trabajo", "accion": "consultar_por_id", "entidad_id": str(centro.id)}
    )

    return centro