from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from models.usuarios import Usuarios
from models.centros_trabajo import CentrosTrabajo
from models.dispositivos_fichaje import DispositivosFichaje
from schemas.dispositivos_fichaje import DispositivoFichajeCreate, DispositivoFichajeResponse, DispositivoFichajeUpdate

router = APIRouter(prefix="/api/dispositivos", tags=["Dispositivos de Fichaje"])

limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=DispositivoFichajeResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")  # Protegido frente a registros automatizados o masivos de terminales
def registrar_dispositivo(
    request: Request,
    obj_in: DispositivoFichajeCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: POST /api/dispositivos
    Registra y autoriza un nuevo terminal de fichaje dentro de una empresa y centro de trabajo.
    """
    if usuario_actual.empresa_id and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar dispositivos en esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
        )

    if obj_in.centro_trabajo_id:
        centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == obj_in.centro_trabajo_id).first()
        if not centro:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Centro de trabajo ({obj_in.centro_trabajo_id}) no encontrado."
            )

    nuevo_dispositivo = DispositivosFichaje(
        empresa_id=obj_in.empresa_id,
        tipo_dispositivo=obj_in.tipo_dispositivo,
        centro_trabajo_id=obj_in.centro_trabajo_id,
        activo=obj_in.activo if obj_in.activo is not None else True
    )
    
    db.add(nuevo_dispositivo)
    db.commit()
    db.refresh(nuevo_dispositivo)
    return nuevo_dispositivo


@router.get("", response_model=List[DispositivoFichajeResponse])
def obtener_todos_los_dispositivos(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/dispositivos
    Devuelve el listado global de terminales aplicando aislamiento multi-tenant.
    """
    query = db.query(DispositivosFichaje)
    
    if usuario_actual.empresa_id:
        query = query.filter(DispositivosFichaje.empresa_id == usuario_actual.empresa_id)

    return query.all()


@router.get("/empresa/{id_empresa}", response_model=List[DispositivoFichajeResponse])
def obtener_dispositivos_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/dispositivos/empresa/{id_empresa}
    Recupera de forma aislada el parque de terminales dado de alta por una empresa concreta (tenant).
    """
    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los dispositivos de esta empresa."
        )

    return db.query(DispositivosFichaje).filter(DispositivosFichaje.empresa_id == id_empresa).all()


@router.get("/centro/{id_centro}", response_model=List[DispositivoFichajeResponse])
def obtener_dispositivos_centro(
    id_centro: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/dispositivos/centro/{id_centro}
    Recupera de forma aislada el parque de terminales dado de alta por un centro de trabajo.
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
            detail="No tienes autorización para consultar los dispositivos de este centro de trabajo."
        )

    return db.query(DispositivosFichaje).filter(DispositivosFichaje.centro_trabajo_id == id_centro).all()


@router.get("/{id_dispositivo}", response_model=DispositivoFichajeResponse)
def obtener_dispositivo(
    id_dispositivo: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
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
    
    if usuario_actual.empresa_id and usuario_actual.empresa_id != dispositivo.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar este dispositivo."
        )

    return dispositivo


@router.put("/{id_dispositivo}/estado", response_model=DispositivoFichajeResponse)
@limiter.limit("20/minute")
def cambiar_estado_dispositivo(
    request: Request,
    id_dispositivo: UUID, 
    activo: bool, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
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
    
    if usuario_actual.empresa_id and usuario_actual.empresa_id != dispositivo.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar el estado de este dispositivo."
        )

    setattr(dispositivo, "activo", activo)
    setattr(dispositivo, "updated_at", datetime.now())
    
    db.commit()
    db.refresh(dispositivo)
    return dispositivo


@router.put("/{id_dispositivo}", response_model=DispositivoFichajeResponse)
@limiter.limit("20/minute")
def actualizar_dispositivo(
    request: Request,
    id_dispositivo: UUID,
    obj_in: DispositivoFichajeUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: PUT /api/dispositivos/{id_dispositivo}
    Actualiza la información de un terminal de fichaje existente.
    """
    dispositivo = db.query(DispositivosFichaje).filter(DispositivosFichaje.id == id_dispositivo).first()
    if not dispositivo:
        raise HTTPException(status_code=404, detail=f"Dispositivo con ID {id_dispositivo} no encontrado.")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != dispositivo.empresa_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar este dispositivo.")

    if obj_in.tipo_dispositivo is not None:
        dispositivo.tipo_dispositivo = obj_in.tipo_dispositivo
        
    if obj_in.centro_trabajo_id is not None:
        dispositivo.centro_trabajo_id = obj_in.centro_trabajo_id
        
    if obj_in.activo is not None:
        dispositivo.activo = obj_in.activo
        
    dispositivo.updated_at = datetime.now()

    db.commit()
    db.refresh(dispositivo)
    return dispositivo


@router.delete("/{id_dispositivo}", status_code=status.HTTP_200_OK)
def dar_de_baja_dispositivo(
    id_dispositivo: UUID,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: DELETE /api/dispositivos/{id_dispositivo}
    Realiza una baja lógica (desactivación) para proteger la integridad 
    de los fichajes históricos asociados al terminal.
    """
    dispositivo = db.query(DispositivosFichaje).filter(DispositivosFichaje.id == id_dispositivo).first()
    if not dispositivo:
        raise HTTPException(status_code=404, detail=f"Dispositivo con ID {id_dispositivo} no encontrado.")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != dispositivo.empresa_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar este dispositivo.")

    dispositivo.activo = False
    dispositivo.updated_at = datetime.now()
    
    db.commit()
    db.refresh(dispositivo)
    
    return {"message": "Dispositivo desactivado correctamente (baja lógica aplicada para proteger el histórico de fichajes)."}