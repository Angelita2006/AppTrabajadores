from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
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

# APIRouter agrupa todos los endpoints relacionados con la gestión de dispositivos de fichaje bajo el prefijo "/api/dispositivos".
router = APIRouter(prefix="/api/dispositivos", tags=["Dispositivos de Fichaje"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
# Esto previene ataques de fuerza bruta o saturación de peticiones en rutas críticas.
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=DispositivoFichajeResponse, status_code=status.HTTP_201_CREATED, summary="Registrar dispositivo de fichaje")
@limiter.limit("20/minute")  # Protegido frente a registros automatizados o masivos de terminales
def registrar_dispositivo(
    request: Request,
    obj_in: DispositivoFichajeCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **POST /api/dispositivos**
    
    Registra y autoriza un nuevo terminal de fichaje dentro de una empresa y centro de trabajo.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de dispositivo de fichaje desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para registrar dispositivos en esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID ({obj_in.empresa_id}) no encontrada."
        )

    if obj_in.centro_trabajo_id:
        centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == obj_in.centro_trabajo_id).first()
        if not centro:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Centro de trabajo con ID ({obj_in.centro_trabajo_id}) no encontrado."
            )

    nuevo_dispositivo = DispositivosFichaje(
        empresa_id=obj_in.empresa_id,
        tipo_dispositivo=obj_in.tipo_dispositivo,
        centro_trabajo_id=obj_in.centro_trabajo_id,
        activo=obj_in.activo if obj_in.activo is not None else True
    )
    
    try:
        db.add(nuevo_dispositivo)
        db.commit()
        
        dispositivo_creado = db.query(DispositivosFichaje).options(
            joinedload(DispositivosFichaje.empresa),
            joinedload(DispositivosFichaje.centro_trabajo)
        ).filter(DispositivosFichaje.id == nuevo_dispositivo.id).first()
        
        return dispositivo_creado
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al registrar el dispositivo de fichaje: {str(error)}"
        )


@router.put("/{id_dispositivo}/estado", response_model=DispositivoFichajeResponse, summary="Cambiar estado de dispositivo")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def cambiar_estado_dispositivo(
    request: Request,
    id_dispositivo: UUID, 
    activo: bool, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **PUT /api/dispositivos/{id_dispositivo}/estado**
    
    Permite activar o desactivar (dar de baja lógica) un terminal de fichaje.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de cambio de estado para el dispositivo {id_dispositivo} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    dispositivo = db.query(DispositivosFichaje).options(
        joinedload(DispositivosFichaje.empresa),
        joinedload(DispositivosFichaje.centro_trabajo)
    ).filter(DispositivosFichaje.id == id_dispositivo).first()
    
    if not dispositivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispositivo con ID ({id_dispositivo}) no encontrado."
        )
    
    if usuario_actual.empresa_id and usuario_actual.empresa_id != dispositivo.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para modificar el estado de este dispositivo."
        )

    setattr(dispositivo, "activo", activo)
    setattr(dispositivo, "updated_at", datetime.now())
    
    try:
        db.commit()
        
        dispositivo_actualizado = db.query(DispositivosFichaje).options(
            joinedload(DispositivosFichaje.empresa),
            joinedload(DispositivosFichaje.centro_trabajo)
        ).filter(DispositivosFichaje.id == id_dispositivo).first()
        
        return dispositivo_actualizado
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el estado del dispositivo: {str(error)}"
        )


@router.put("/{id_dispositivo}", response_model=DispositivoFichajeResponse, summary="Actualizar dispositivo")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def actualizar_dispositivo(
    request: Request,
    id_dispositivo: UUID,
    obj_in: DispositivoFichajeUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **PUT /api/dispositivos/{id_dispositivo}**
    
    Actualiza la información de un terminal de fichaje existente.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de actualización del dispositivo {id_dispositivo} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    dispositivo = db.query(DispositivosFichaje).options(
        joinedload(DispositivosFichaje.empresa),
        joinedload(DispositivosFichaje.centro_trabajo)
    ).filter(DispositivosFichaje.id == id_dispositivo).first()
    
    if not dispositivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispositivo con ID ({id_dispositivo}) no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != dispositivo.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para modificar este dispositivo."
        )

    if obj_in.tipo_dispositivo is not None:
        dispositivo.tipo_dispositivo = obj_in.tipo_dispositivo
        
    if obj_in.centro_trabajo_id is not None:
        dispositivo.centro_trabajo_id = obj_in.centro_trabajo_id
        
    if obj_in.activo is not None:
        dispositivo.activo = obj_in.activo
        
    dispositivo.updated_at = datetime.now()

    try:
        db.commit()
        
        dispositivo_actualizado = db.query(DispositivosFichaje).options(
            joinedload(DispositivosFichaje.empresa),
            joinedload(DispositivosFichaje.centro_trabajo)
        ).filter(DispositivosFichaje.id == id_dispositivo).first()
        
        return dispositivo_actualizado
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el dispositivo: {str(error)}"
        )


@router.delete("/{id_dispositivo}", status_code=status.HTTP_200_OK, summary="Dar de baja dispositivo")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def dar_de_baja_dispositivo(
    request: Request,
    id_dispositivo: UUID,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **DELETE /api/dispositivos/{id_dispositivo}**
    
    Realiza una baja lógica (desactivación) para proteger la integridad 
    de los fichajes históricos asociados al terminal.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de baja lógica del dispositivo {id_dispositivo} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    dispositivo = db.query(DispositivosFichaje).options(
        joinedload(DispositivosFichaje.empresa),
        joinedload(DispositivosFichaje.centro_trabajo)
    ).filter(DispositivosFichaje.id == id_dispositivo).first()
    
    if not dispositivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispositivo con ID ({id_dispositivo}) no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != dispositivo.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para modificar este dispositivo."
        )

    dispositivo.activo = False
    dispositivo.updated_at = datetime.now()
    
    try:
        db.commit()
        return {"message": "Dispositivo desactivado correctamente (baja lógica aplicada para proteger el histórico de fichajes)."}
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al dar de baja el dispositivo: {str(error)}"
        )


@router.get("/empresa/{id_empresa}", response_model=List[DispositivoFichajeResponse], summary="Obtener dispositivos por empresa")
@limiter.limit("60/minute")  # Limita las consultas masivas de listados de dispositivos por empresa
def obtener_dispositivos_empresa(
    request: Request,
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/dispositivos/empresa/{id_empresa}**
    
    Recupera de forma aislada el parque de terminales dado de alta por una empresa concreta (tenant).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de dispositivos para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes autorización para consultar los dispositivos de esta empresa."
        )

    return (
        db.query(DispositivosFichaje)
        .options(
            joinedload(DispositivosFichaje.empresa),
            joinedload(DispositivosFichaje.centro_trabajo)
        )
        .filter(DispositivosFichaje.empresa_id == id_empresa)
        .all()
    )


@router.get("/centro/{id_centro}", response_model=List[DispositivoFichajeResponse], summary="Obtener dispositivos por centro de trabajo")
@limiter.limit("60/minute")  # Limita las consultas masivas de listados de dispositivos por centro de trabajo
def obtener_dispositivos_centro(
    request: Request,
    id_centro: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/dispositivos/centro/{id_centro}**
    
    Recupera de forma aislada el parque de terminales dado de alta por un centro de trabajo.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de dispositivos para el centro {id_centro} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == id_centro).first()
    if not centro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo con ID ({id_centro}) no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != centro.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes autorización para consultar los dispositivos de este centro de trabajo."
        )

    return (
        db.query(DispositivosFichaje)
        .options(
            joinedload(DispositivosFichaje.empresa),
            joinedload(DispositivosFichaje.centro_trabajo)
        )
        .filter(DispositivosFichaje.centro_trabajo_id == id_centro)
        .all()
    )


@router.get("/{id_dispositivo}", response_model=DispositivoFichajeResponse, summary="Obtener dispositivo por ID")
@limiter.limit("60/minute")  # Limita las consultas de detalles de un dispositivo específico
def obtener_dispositivo(
    request: Request,
    id_dispositivo: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/dispositivos/{id_dispositivo}**
    
    Busca los detalles técnicos de un terminal específico utilizando su ID único UUID.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle del dispositivo {id_dispositivo} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    dispositivo = db.query(DispositivosFichaje).options(
        joinedload(DispositivosFichaje.empresa),
        joinedload(DispositivosFichaje.centro_trabajo)
    ).filter(DispositivosFichaje.id == id_dispositivo).first()
    
    if not dispositivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispositivo con ID ({id_dispositivo}) no encontrado."
        )
    
    if usuario_actual.empresa_id and usuario_actual.empresa_id != dispositivo.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes autorización para consultar este dispositivo."
        )

    return dispositivo