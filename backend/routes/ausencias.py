import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session, joinedload

from core.auditoria import registrar_auditoria
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    AlcancePermisoEnum,
    EstadoAusenciaEnum,
    TipoPermisoEnum,
)
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from models.ausencias import Ausencias
from models.empresas import Empresas
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from schemas.ausencias import AusenciaCreate, AusenciaResponse, AusenciaUpdate

# APIRouter agrupa todos los endpoints relacionados con el control de ausencias y bajas bajo el prefijo "/api/ausencias".
router = APIRouter(prefix="/api/ausencias", tags=["Control de Ausencias y Bajas"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "/empresa/{id_empresa}",
    response_model=List[AusenciaResponse],
    summary="Obtener ausencias por empresa",
    description="Obtiene las ausencias de una empresa.",
)
def obtener_ausencias_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.AUSENCIAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/ausencias/empresa/{id_empresa}**

    Obtiene las ausencias de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de ausencias para la empresa ({id_empresa}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        print(f"Empresa ({id_empresa}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Empresa no encontrada.")

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "ausencias",
            'accion': "consultar_empresa",
        },
        trabajador_id=None
    )
    db.commit()

    ausencias = (
        db.query(Ausencias)
        .options(joinedload(Ausencias.empresa), joinedload(Ausencias.trabajador), joinedload(Ausencias.usuario_validador))
        .filter(Ausencias.empresa_id == id_empresa)
        .all()
    )

    return ausencias

@router.get(
    "/trabajador/{id_trabajador}",
    response_model=List[AusenciaResponse],
    summary="Obtener ausencias por trabajador",
    description="Obtiene las ausencias de un trabajador.",
)
def obtener_ausencias_trabajador(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.AUSENCIAS+"-"+AlcancePermisoEnum.PROPIO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/ausencias/trabajador/{id_trabajador}**

    Obtiene las ausencias de un trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de ausencias para el trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    if (
        getattr(request.state, "alcance_efectivo", None) == AlcancePermisoEnum.PROPIO.value
        and trabajador.usuario_id != usuario_actual.id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "ausencias",
            'accion': "consultar_trabajador",
        },
        trabajador_id=id_trabajador
    )
    db.commit()

    ausencias = (
        db.query(Ausencias)
        .options(joinedload(Ausencias.empresa), joinedload(Ausencias.trabajador), joinedload(Ausencias.usuario_validador))
        .filter(Ausencias.trabajador_id == id_trabajador)
        .all()
    )

    return ausencias
@router.get(
    "/{id_ausencia}",
    response_model=AusenciaResponse,
    summary="Obtener ausencia por id",
    description="Obtiene la ausencia por id.",
)
def obtener_ausencia_id(
    request: Request,
    id_ausencia: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.AUSENCIAS+"-"+AlcancePermisoEnum.PROPIO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/ausencias/{id_ausencia}**

    Obtiene la ausencia por id.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de ausencia por id ({id_ausencia}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa_id = request.headers.get("Empresa-ID")
    ausencia = db.query(Ausencias).options(joinedload(Ausencias.trabajador)).filter(Ausencias.id == id_ausencia).first()
    if not ausencia:
        print(f"Ausencia ({id_ausencia}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ausencia no encontrada.")

    if (
        getattr(request.state, "alcance_efectivo", None) == AlcancePermisoEnum.PROPIO.value
        and (ausencia.trabajador is None or ausencia.trabajador.usuario_id != usuario_actual.id)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ausencia no encontrada.")

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "ausencias",
            'accion': "consultar_id",
        },
        trabajador_id=ausencia.trabajador_id
    )
    db.commit()

    return ausencia

@router.post(
    "",
    response_model=AusenciaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear ausencia",
    description="Crea una nueva ausencia (vacaciones, baja, etc.) en estado 'pendiente' por defecto.",
)
@limiter.limit("20/minute")
def crear_ausencia(
    request: Request,
    payload: AusenciaCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR+"-"+TipoPermisoEnum.AUSENCIAS+"-"+AlcancePermisoEnum.PROPIO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **POST /api/ausencias**

    Crea una nueva ausencia (vacaciones, baja, etc.) en estado 'pendiente' por defecto.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de ausencia para el trabajador ({payload.trabajador_id}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == payload.empresa_id).first()
    if not empresa:
        print(f"Empresa ({payload.empresa_id}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Empresa no encontrada.")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == payload.trabajador_id).first()
    if not trabajador:
        print(f"Trabajador ({payload.trabajador_id}) no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Trabajador no encontrado.")

    if (
        getattr(request.state, "alcance_efectivo", None) == AlcancePermisoEnum.PROPIO.value
        and trabajador.usuario_id != usuario_actual.id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo puedes solicitar ausencias para tu propio perfil.")

    nueva_ausencia = Ausencias(
        empresa_id=payload.empresa_id,
        trabajador_id=payload.trabajador_id,
        tipo_ausencia=payload.tipo_ausencia,
        estado=EstadoAusenciaEnum.PENDIENTE,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
        motivo=payload.motivo,
        justificante_url=payload.justificante_url
    )

    try:
        db.add(nueva_ausencia)
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=empresa.id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': "ausencias",
                'accion': "crear",
            },
            trabajador_id=trabajador.id
        )
        db.commit()

        ausencia_creada = (
            db.query(Ausencias)
            .options(joinedload(Ausencias.empresa), joinedload(Ausencias.trabajador), joinedload(Ausencias.usuario_validador))
            .filter(Ausencias.id == nueva_ausencia.id)
            .first()
        )

        print(f"Ausencia creada con éxito ({nueva_ausencia.id}).")
        return ausencia_creada
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear la ausencia: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido crear la ausencia."
        )

@router.put(
    "/{id_ausencia}/cancelar",
    response_model=AusenciaResponse,
    summary="Cancelar ausencia",
    description="Tramita la cancelación de una ausencia.",
)
@limiter.limit("20/minute")
def cancelar_ausencia(
    request: Request,
    id_ausencia: UUID,
    payload: AusenciaUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.AUSENCIAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/ausencias/{id_ausencia}/cancelar**

    Tramita la cancelación de una ausencia.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de cancelación para la ausencia ({id_ausencia}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    ausencia = db.query(Ausencias).filter(Ausencias.id == id_ausencia).first()
    if not ausencia:
        print(f"Ausencia ({id_ausencia}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ausencia no encontrada.")

    # Impide cancelar una solicitud que no fue aprobada previamente
    if ausencia.estado != EstadoAusenciaEnum.APROBADA:
        print(f"Intento de cancelar una ausencia no aprobada ({id_ausencia}, Estado actual: {ausencia.estado}).")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta solicitud no ha sido aprobada previamente.")

    # Inyección de los parámetros de cancelación
    setattr(ausencia, "estado", EstadoAusenciaEnum.CANCELADA)
    setattr(ausencia, "updated_at", datetime.datetime.now())

    db.commit()

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=ausencia.empresa_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={
            'recurso': "ausencias",
            'accion': "cancelar",
        },
        trabajador_id=ausencia.trabajador_id
    )
    db.commit()

    ausencia_cancelada = (
        db.query(Ausencias)
        .options(joinedload(Ausencias.empresa), joinedload(Ausencias.trabajador), joinedload(Ausencias.usuario_validador))
        .filter(Ausencias.id == id_ausencia)
        .first()
    )

    print(f"Ausencia ({id_ausencia}) cancelada exitosamente.")
    return ausencia_cancelada

@router.put(
    "/{id_ausencia}/resolver",
    response_model=AusenciaResponse,
    summary="Resolver ausencia",
    description="Tramita la resolución (aprobación/rechazo) de una ausencia.",
)
@limiter.limit("20/minute")
def resolver_ausencia(
    request: Request,
    id_ausencia: UUID,
    payload: AusenciaUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.AUSENCIAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/ausencias/{id_ausencia}/resolver**

    Tramita la resolución (aprobación/rechazo) de una ausencia.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de resolución para la ausencia ({id_ausencia}) con estado '{payload.estado}' desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    ausencia = db.query(Ausencias).filter(Ausencias.id == id_ausencia).first()
    if not ausencia:
        print(f"Ausencia ({id_ausencia}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ausencia no encontrada.")

    # Impide modificar una solicitud que ya fue procesada previamente
    if ausencia.estado != EstadoAusenciaEnum.PENDIENTE:
        print(f"Intento de resolver una ausencia ya procesada ({id_ausencia}, Estado actual: {ausencia.estado}).")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta solicitud ya ha sido resuelta previamente.")

    resolutor = db.query(Usuarios).filter(Usuarios.id == payload.usuario_validador_id).first()
    if not resolutor:
        print(f"Usuario validador {payload.usuario_validador_id} no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario validador no encontrado.")

    if payload.estado == EstadoAusenciaEnum.PENDIENTE:
        print("Intento inválido de cambiar el estado a pendiente durante la resolución.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede devolver una solicitud al estado pendiente.")

    # Inyección de los parámetros de resolución
    setattr(ausencia, "estado", payload.estado)
    setattr(ausencia, "usuario_validador_id", payload.usuario_validador_id)
    setattr(ausencia, "observaciones_admin", payload.observaciones_admin)
    setattr(ausencia, "fecha_resolucion", datetime.datetime.now())
    setattr(ausencia, "updated_at", datetime.datetime.now())

    db.commit()

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=ausencia.empresa_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={
            'recurso': "ausencias",
            'accion': "resolver",
        },
        trabajador_id=ausencia.trabajador_id
    )
    db.commit()

    ausencia_resuelta = (
        db.query(Ausencias)
        .options(joinedload(Ausencias.empresa), joinedload(Ausencias.trabajador), joinedload(Ausencias.usuario_validador))
        .filter(Ausencias.id == id_ausencia)
        .first()
    )

    print(f"Ausencia ({id_ausencia}) resuelta exitosamente con estado '{payload.estado}'.")
    return ausencia_resuelta

@router.put(
    "/{id_ausencia}",
    response_model=AusenciaResponse,
    summary="Modificar ausencia",
    description="Modificar una ausencia.",
)
@limiter.limit("20/minute")
def modificar_ausencia(
    request: Request,
    id_ausencia: UUID,
    payload: AusenciaUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.AUSENCIAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/ausencias/{id_ausencia}**

    Modificar una ausencia.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación para la ausencia ({id_ausencia}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    ausencia = db.query(Ausencias).filter(Ausencias.id == id_ausencia).first()
    if not ausencia:
        print(f"Ausencia ({id_ausencia}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ausencia no encontrada.")

    # Impide modificar una solicitud que no fue aprobada previamente
    if ausencia.estado != EstadoAusenciaEnum.APROBADA:
        print(f"Intento de modificar una ausencia no aprobada ({id_ausencia}, Estado actual: {ausencia.estado}).")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta solicitud no ha sido aprobada previamente.")

    # Inyección de los parámetros de resolución
    setattr(ausencia, "fecha_inicio", payload.fecha_inicio)
    setattr(ausencia, "fecha_fin", payload.fecha_fin)
    setattr(ausencia, "justificante_url", payload.justificante_url)
    setattr(ausencia, "tipo_ausencia", payload.tipo_ausencia)
    setattr(ausencia, "observaciones_admin", payload.observaciones_admin)
    setattr(ausencia, "updated_at", datetime.datetime.now())

    db.commit()

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=ausencia.empresa_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={
            'recurso': "ausencias",
            'accion': "modificar",
        },
        trabajador_id=ausencia.trabajador_id
    )
    db.commit()

    ausencia_modificada = (
        db.query(Ausencias)
        .options(joinedload(Ausencias.empresa), joinedload(Ausencias.trabajador), joinedload(Ausencias.usuario_validador))
        .filter(Ausencias.id == id_ausencia)
        .first()
    )

    print(f"Ausencia ({id_ausencia}) modificada exitosamente.")
    return ausencia_modificada

