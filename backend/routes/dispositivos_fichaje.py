from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session, joinedload

from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum, AccionPermisoEnum, TipoPermisoEnum
from core.security import (
    get_db_with_advanced_security,
    verificar_permisos_requeridos,
)
from models.centros_trabajo import CentrosTrabajo
from models.dispositivos_fichaje import DispositivosFichaje
from models.empresas import Empresas
from models.usuarios import Usuarios
from schemas.dispositivos_fichaje import (
    DispositivoFichajeCreate,
    DispositivoFichajeResponse,
    DispositivoFichajeUpdate,
)

# APIRouter agrupa todos los endpoints relacionados con la gestión de dispositivos de fichaje bajo el prefijo "/api/dispositivos".
router = APIRouter(prefix="/api/dispositivos", tags=["Dispositivos de Fichaje"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "/centro/{id_centro}",
    response_model=List[DispositivoFichajeResponse],
    summary="Obtener dispositivos de fichaje por centro de trabajo",
    description="Obtiene los dispositivos de fichaje de un centro de trabajo.",
)
@limiter.limit("60/minute")
def obtener_dispositivos_fichaje_centro(
    request: Request,
    id_centro: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.DISPOSITIVOS_FICHAJE])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/dispositivos/centro/{id_centro}**

    Obtiene los dispositivos de fichaje de un centro de trabajo.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de dispositivos de fichaje para el centro de trabajo ({id_centro}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == id_centro).first()
    if not centro:
        print(f"Centro de trabajo ({id_centro}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo no encontrado."
        )

    resultados = (
        db.query(DispositivosFichaje).options(
        joinedload(DispositivosFichaje.empresa),
        joinedload(DispositivosFichaje.centro_trabajo))
        .filter(DispositivosFichaje.centro_trabajo_id == id_centro, DispositivosFichaje.activo.is_(True))
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=centro.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "dispositivos_fichaje",
            'accion': "consultar_centro",
        },
        trabajador_id=None
    )
    db.commit()

    return resultados

@router.get(
    "/empresa/{id_empresa}",
    response_model=List[DispositivoFichajeResponse],
    summary="Obtener dispositivos de fichaje por empresa",
    description="Obtiene los dispositivos de fichaje de una empresa.",
)
@limiter.limit("60/minute")
def obtener_dispositivos_fichaje_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.DISPOSITIVOS_FICHAJE])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/dispositivos/empresa/{id_empresa}**

    Obtiene los dispositivos de fichaje de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de dispositivos de fichaje para la empresa ({id_empresa}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    resultados = (
        db.query(DispositivosFichaje).options(
        joinedload(DispositivosFichaje.empresa),
        joinedload(DispositivosFichaje.centro_trabajo))
        .filter(DispositivosFichaje.empresa_id == id_empresa, DispositivosFichaje.activo.is_(True))
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "dispositivos_fichaje",
            'accion': "consultar_empresa",
        },
        trabajador_id=None
    )
    db.commit()

    return resultados

@router.get(
    "/{id_dispositivo}",
    response_model=DispositivoFichajeResponse,
    summary="Obtener dispositivo por id",
    description="Obtiene el dispositivo de fichaje por su id.",
)
@limiter.limit("60/minute")
def obtener_dispositivo_fichaje_id(
    request: Request,
    id_dispositivo: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.CALENDARIOS_LABORALES])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/dispositivos/{id_dispositivo}**

    Obtiene el dispositivo de fichaje por su id.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta del dispositivo de fichaje ({id_dispositivo}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    dispositivo = (
        db.query(DispositivosFichaje).options(
        joinedload(DispositivosFichaje.empresa),
        joinedload(DispositivosFichaje.centro_trabajo))
        .filter(DispositivosFichaje.id == id_dispositivo)
        .first()
    )

    if not dispositivo:
        print(f"Dispositivo de fichaje ({id_dispositivo}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispositivo de fichaje no encontrado."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=dispositivo.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "dispositivos_fichaje",
            'accion': "consultar",
        },
        trabajador_id=None
    )
    db.commit()

    return dispositivo
@router.post(
    "",
    response_model=DispositivoFichajeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear dispositivo de fichaje",
    description="Crea un nuevo dispositivo de fichaje dentro de una empresa y centro de trabajo.",
)
@limiter.limit("20/minute")
def crear_dispositivo_fichaje(
    request: Request,
    payload: DispositivoFichajeCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR+"-"+TipoPermisoEnum.DISPOSITIVOS_FICHAJE])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **POST /api/dispositivos**

    Crea un nuevo dispositivo de fichaje dentro de una empresa y centro de trabajo.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de dispositivo de fichaje desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == payload.empresa_id).first()
    if not empresa:
        print(f"Empresa ({payload.empresa_id}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa no encontrada."
        )

    if payload.centro_trabajo_id:
        centro = db.query(CentrosTrabajo).filter(
            CentrosTrabajo.id == payload.centro_trabajo_id,
            CentrosTrabajo.activo.is_(True),
        ).first()
        if not centro:
            print(f"Centro de trabajo ({payload.centro_trabajo_id}) no encontrado.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Centro de trabajo no encontrado."
            )

    nuevo_dispositivo = DispositivosFichaje(
        empresa_id=payload.empresa_id,
        tipo_dispositivo=payload.tipo_dispositivo,
        centro_trabajo_id=payload.centro_trabajo_id,
        activo=payload.activo if payload.activo is not None else True
    )

    try:
        db.add(nuevo_dispositivo)
        db.commit()

        dispositivo_creado = (
            db.query(DispositivosFichaje).options(
            joinedload(DispositivosFichaje.empresa),
            joinedload(DispositivosFichaje.centro_trabajo))
            .filter(DispositivosFichaje.id == nuevo_dispositivo.id)
            .first()
        )

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=payload.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': "dispositivos_fichaje",
                'accion': "crear",
            },
            trabajador_id=None
        )
        db.commit()

        return dispositivo_creado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear el dispositivo de fichaje: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido crear el dispositivo de fichaje."
        )

@router.put(
    "/{id_dispositivo}/desactivar",
    status_code=status.HTTP_200_OK,
    summary="Desactivar dispositivo de fichaje",
    description="Desactiva un dispositivo de fichaje.",
)
@limiter.limit("20/minute")
def desactivar_dispositivo_fichaje(
    request: Request,
    id_dispositivo: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.DISPOSITIVOS_FICHAJE])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/dispositivos/{id_dispositivo}/desactivar**

    Desactiva un dispositivo de fichaje.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de desactivación del dispositivo de fichaje ({id_dispositivo}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    dispositivo = (
        db.query(DispositivosFichaje).options(
        joinedload(DispositivosFichaje.empresa),
        joinedload(DispositivosFichaje.centro_trabajo))
        .filter(DispositivosFichaje.id == id_dispositivo)
        .first()
    )

    if not dispositivo:
        print(f"Dispositivo de fichaje ({id_dispositivo}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispositivo de fichaje no encontrado."
        )

    setattr(dispositivo, "activo", False)
    setattr(dispositivo, "updated_at", datetime.now())

    try:
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=dispositivo.empresa_id,
            accion=AccionAuditoriaEnum.ELIMINACION,
            detalle={
                'recurso': "dispositivos_fichaje",
                'accion': "desactivar",
            },
            trabajador_id=None
        )
        db.commit()

        print(f"Dispositivo de fichaje ({id_dispositivo}) desactivado correctamente (enviado a papelera).")
        return {"detail": "Dispositivo de fichaje desactivado correctamente (enviado a papelera)."}
    except Exception as e:
        db.rollback()
        print(f"No se ha podido desactivar el dispositivo de fichaje: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido desactivar el dispositivo de fichaje."
        )

@router.put(
    "/{id_dispositivo}/estado",
    response_model=DispositivoFichajeResponse,
    summary="Modificar estado de dispositivo de fichaje",
    description="Permite activar o desactivar un dispositivo de fichaje.",
)
@limiter.limit("20/minute")
def modificar_estado_dispositivo_fichaje(
    request: Request,
    id_dispositivo: UUID,
    payload: DispositivoFichajeUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.DISPOSITIVOS_FICHAJE])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/dispositivos/{id_dispositivo}/estado**

    Permite activar o desactivar un dispositivo de fichaje.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de estado para el dispositivo de fichaje ({id_dispositivo}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    dispositivo = db.query(DispositivosFichaje).options(
        joinedload(DispositivosFichaje.empresa),
        joinedload(DispositivosFichaje.centro_trabajo)
    ).filter(DispositivosFichaje.id == id_dispositivo).first()

    if not dispositivo:
        print(f"Dispositivo de fichaje ({id_dispositivo}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispositivo de fichaje no encontrado."
        )

    setattr(dispositivo, "activo", payload.activo)
    setattr(dispositivo, "updated_at", datetime.now())

    try:
        db.commit()

        dispositivo_modificado = (
            db.query(DispositivosFichaje).options(
            joinedload(DispositivosFichaje.empresa),
            joinedload(DispositivosFichaje.centro_trabajo))
            .filter(DispositivosFichaje.id == id_dispositivo)
            .first()
        )

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=dispositivo.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': "dispositivos_fichaje",
                'accion': "modificar_estado",
            },
            trabajador_id=None
        )
        db.commit()

        return dispositivo_modificado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido modificar el estado del dispositivo de fichaje: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido modificar el estado del dispositivo de fichaje."
        )

@router.put(
    "/{id_dispositivo}",
    response_model=DispositivoFichajeResponse,
    summary="Modificar dispositivo de fichaje",
    description="Modifica los datos de un dispositivo de fichaje.",
)
@limiter.limit("20/minute")
def modificar_dispositivo_fichaje(
    request: Request,
    id_dispositivo: UUID,
    payload: DispositivoFichajeUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.DISPOSITIVOS_FICHAJE])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/dispositivos/{id_dispositivo}**

    Modifica los datos de un dispositivo de fichaje.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación del dispositivo de fichaje ({id_dispositivo}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    dispositivo = (
        db.query(DispositivosFichaje).options(
        joinedload(DispositivosFichaje.empresa),
        joinedload(DispositivosFichaje.centro_trabajo))
        .filter(DispositivosFichaje.id == id_dispositivo)
        .first()
    )

    if not dispositivo:
        print(f"Dispositivo de fichaje ({id_dispositivo}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispositivo de fichaje no encontrado."
        )

    setattr(dispositivo, "tipo_dispositivo", payload.tipo_dispositivo)
    setattr(dispositivo, "activo", payload.activo)
    setattr(dispositivo, "updated_at", datetime.now())

    try:
        db.commit()

        dispositivo_actualizado = (
            db.query(DispositivosFichaje).options(
            joinedload(DispositivosFichaje.empresa),
            joinedload(DispositivosFichaje.centro_trabajo))
            .filter(DispositivosFichaje.id == id_dispositivo)
            .first()
        )

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=dispositivo.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': "dispositivos_fichaje",
                'accion': "modificar",
            },
            trabajador_id=None
        )
        db.commit()

        return dispositivo_actualizado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido actualizar el dispositivo: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido actualizar el dispositivo."
        )

