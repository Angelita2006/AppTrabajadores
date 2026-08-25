from fastapi import APIRouter, Depends, HTTPException, status, Request
import httpx
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.contratos import Contratos
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from models.centros_trabajo import CentrosTrabajo
from models.usuarios import Usuarios
from schemas.centros_trabajo import CentroTrabajoCreate, CentroTrabajoResponse, CentroTrabajoUpdate

router = APIRouter(prefix="/api/centros-trabajo", tags=["Centros de Trabajo"])

limiter = Limiter(key_func=get_remote_address)

async def obtener_coordenadas(direccion: str):
    """Consulta la API pública de Nominatim para obtener lat/lon a partir de un texto."""
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": direccion, "format": "json", "limit": 1}
    headers = {"User-Agent": "TuAppDeFichajes/1.0"} # Nominatim exige un User-Agent válido
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    return None, None

@router.post("", response_model=CentroTrabajoResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def crear_centro_trabajo(
    request: Request,
    obj_in: CentroTrabajoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: POST /api/centros-trabajo
    Registra una nueva sede física vinculada a una empresa cliente (tenant) validando los datos con Pydantic.
    """
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

        # 2. Mapea los datos del esquema directamente al modelo físico de SQLAlchemy
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

@router.put("/{id_centro}/estado", response_model=CentroTrabajoResponse)
@limiter.limit("20/minute")
def cambiar_estado_centro(
    request: Request,
    id_centro: UUID, 
    activo: bool, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
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
    
    if usuario_actual.empresa_id and usuario_actual.empresa_id != centro.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar el estado de este centro de trabajo."
        )

    # Modificación segura utilizando setattr para eludir advertencias estrictas de tipo en Pylance
    setattr(centro, "activo", activo)
    setattr(centro, "updated_at", datetime.now())
    
    db.commit()
    db.refresh(centro)
    return centro


@router.put("/{id_centro}/editar", response_model=CentroTrabajoResponse)
@limiter.limit("20/minute")
async def editar_centro(
    request: Request,
    id_centro: UUID, 
    nuevos_datos: CentroTrabajoUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: PUT /api/centros-trabajo/{id_centro}/editar
    Permite editar los datos del centro de trabajo y recalcula las coordenadas si es necesario.
    """
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
        db.refresh(centro)
        return centro

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al actualizar el centro de trabajo: {str(error)}"
        )


@router.delete("/{id_centro}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("20/minute")
def eliminar_centro_trabajo(
    request: Request,
    id_centro: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: DELETE /api/centros-trabajo/{id_centro}
    Elimina físicamente una sede de la base de datos previa validación de contratos activos.
    """
    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == id_centro).first()
    if not centro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo con ID {id_centro} no encontrado."
        )
    
    if usuario_actual.empresa_id and usuario_actual.empresa_id != centro.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar este centro de trabajo."
        )

    contratos_activos = db.query(Contratos).filter(
        Contratos.centro_trabajo_id == id_centro,
        Contratos.activo == True
    ).count()

    if contratos_activos > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Acción bloqueada: No se puede eliminar el centro de trabajo porque tiene {contratos_activos} contrato(s) activo(s) asociado(s). Debe rescindirlos o reasignarlos primero."
        )

    try:
        db.delete(centro)
        db.commit()
        return
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No se puede eliminar el centro de trabajo porque contiene registros "
                f"históricos vinculados (fichajes u otras dependencias). Error: {str(error)}"
            )
        )

@router.get("/empresa/{id_empresa}", response_model=List[CentroTrabajoResponse])
def obtener_centros_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/centros-trabajo/empresa/{id_empresa}
    Recupera de forma aislada las sedes físicas dadas de alta por una organización concreta (tenant).
    """
    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los centros de trabajo de esta empresa."
        )

    return db.query(CentrosTrabajo).filter(CentrosTrabajo.empresa_id == id_empresa).all()


@router.get("/{id_centro}", response_model=CentroTrabajoResponse)
def obtener_centro_trabajo(
    id_centro: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
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

    if usuario_actual.empresa_id and usuario_actual.empresa_id != centro.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar este centro de trabajo."
        )

    return centro