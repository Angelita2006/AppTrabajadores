from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session, joinedload

from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum, AccionPermisoEnum, TipoPermisoEnum
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from models.calendarios_laborales import CalendariosLaborales
from models.contratos import Contratos
from models.contratos_calendarios import ContratosCalendarios
from models.usuarios import Usuarios
from schemas.contratos_calendarios import (
    ContratoCalendarioCreate,
    ContratoCalendarioResponse,
    ContratoCalendarioUpdate,
)

router = APIRouter(
    prefix="/api/contratos-calendarios",
    tags=["Relaciones contratos y calendarios"],
)
limiter = Limiter(key_func=get_remote_address)


def _relacion_query(db: Session):
    return db.query(ContratosCalendarios).options(
        joinedload(ContratosCalendarios.contrato),
        joinedload(ContratosCalendarios.calendario_laboral),
    )


def _obtener_relacion_o_404(db: Session, id_relacion: UUID) -> ContratosCalendarios:
    relacion = _relacion_query(db).filter(ContratosCalendarios.id == id_relacion).first()
    if not relacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la asociación contrato-calendario.",
        )
    return relacion


def _validar_vigencia_calendario(
    contrato: Contratos,
    calendario: CalendariosLaborales,
) -> None:
    if contrato.empresa_id != calendario.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El contrato y el calendario deben pertenecer a la misma empresa.",
        )

    if contrato.centro_trabajo_id != calendario.centro_trabajo_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El calendario debe corresponder al centro de trabajo del contrato.",
        )

    anio_inicio = contrato.fecha_inicio.year
    anio_fin = contrato.fecha_fin.year if contrato.fecha_fin else None
    if calendario.anio < anio_inicio or (anio_fin is not None and calendario.anio > anio_fin):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El año del calendario debe estar dentro de la vigencia del contrato.",
        )


@router.post(
    "",
    response_model=ContratoCalendarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Asociar un calendario laboral a un contrato",
)
@limiter.limit("20/minute")
def crear_contrato_calendario(
    request: Request,
    payload: ContratoCalendarioCreate,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.CONTRATOS_CALENDARIOS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/contratos-calendarios**

    Asocia un calendario laboral anual a un contrato.
    """
    contrato = (
        db.query(Contratos)
        .filter(Contratos.id == payload.contrato_id, Contratos.activo.is_(True))
        .first()
    )
    if not contrato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato activo no encontrado.")

    calendario = (
        db.query(CalendariosLaborales)
        .filter(
            CalendariosLaborales.id == payload.calendario_laboral_id,
            CalendariosLaborales.activo.is_(True),
        )
        .first()
    )
    if not calendario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendario activo no encontrado.")

    _validar_vigencia_calendario(contrato, calendario)

    existente = (
        db.query(ContratosCalendarios)
        .filter(
            ContratosCalendarios.contrato_id == contrato.id,
            ContratosCalendarios.calendario_laboral_id == calendario.id,
        )
        .first()
    )
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una asociación entre este contrato y calendario.",
        )

    relacion = ContratosCalendarios(
        contrato_id=contrato.id,
        calendario_laboral_id=calendario.id,
        activa=True,
    )
    try:
        db.add(relacion)
        db.flush()
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=contrato.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                "recurso": "contratos_calendarios",
                "accion": "asociar",
                "entidad_id": str(relacion.id),
            },
            trabajador_id=contrato.trabajador_id,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo asociar el calendario al contrato.",
        )

    return _obtener_relacion_o_404(db, relacion.id)


@router.get(
    "/contrato/{id_contrato}",
    response_model=List[ContratoCalendarioResponse],
    summary="Listar calendarios asociados a un contrato",
)
@limiter.limit("60/minute")
def obtener_calendarios_contrato(
    request: Request,
    id_contrato: UUID,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.CONTRATOS_CALENDARIOS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/contratos-calendarios/contrato/{id_contrato}**

    Lista los calendarios activos asociados al contrato.
    """
    contrato = db.query(Contratos).filter(Contratos.id == id_contrato).first()
    if not contrato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato no encontrado.")

    return (
        _relacion_query(db)
        .filter(
            ContratosCalendarios.contrato_id == id_contrato,
            ContratosCalendarios.activa.is_(True),
        )
        .order_by(CalendariosLaborales.anio.asc())
        .join(
            CalendariosLaborales,
            ContratosCalendarios.calendario_laboral_id == CalendariosLaborales.id,
        )
        .all()
    )


@router.get(
    "/empresa/{id_empresa}",
    response_model=List[ContratoCalendarioResponse],
    summary="Listar asociaciones de contratos y calendarios de una empresa",
)
@limiter.limit("60/minute")
def obtener_relaciones_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.CONTRATOS_CALENDARIOS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/contratos-calendarios/empresa/{id_empresa}**

    Lista las asociaciones activas de contratos y calendarios de la empresa.
    """
    return (
        _relacion_query(db)
        .join(Contratos, ContratosCalendarios.contrato_id == Contratos.id)
        .filter(
            Contratos.empresa_id == id_empresa,
            ContratosCalendarios.activa.is_(True),
        )
        .order_by(ContratosCalendarios.created_at.desc())
        .all()
    )


@router.get(
    "/{id_relacion}",
    response_model=ContratoCalendarioResponse,
    summary="Obtener una asociación contrato-calendario",
)
@limiter.limit("60/minute")
def obtener_contrato_calendario(
    request: Request,
    id_relacion: UUID,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.CONTRATOS_CALENDARIOS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/contratos-calendarios/{id_relacion}**

    Obtiene una asociación entre contrato y calendario por su identificador.
    """
    return _obtener_relacion_o_404(db, id_relacion)


@router.patch(
    "/{id_relacion}",
    response_model=ContratoCalendarioResponse,
    summary="Actualizar el estado de una asociación contrato-calendario",
)
@limiter.limit("20/minute")
def modificar_contrato_calendario(
    request: Request,
    id_relacion: UUID,
    payload: ContratoCalendarioUpdate,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.CONTRATOS_CALENDARIOS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PATCH /api/contratos-calendarios/{id_relacion}**

    Actualiza el estado de una asociación entre contrato y calendario.
    """
    relacion = _obtener_relacion_o_404(db, id_relacion)
    if payload.activa is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Debes indicar el nuevo valor de activa.",
        )

    if payload.activa:
        contrato = db.query(Contratos).filter(Contratos.id == relacion.contrato_id).first()
        calendario = (
            db.query(CalendariosLaborales)
            .filter(CalendariosLaborales.id == relacion.calendario_laboral_id)
            .first()
        )
        if not contrato or not calendario or not contrato.activo or not calendario.activo:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede activar la asociación porque el contrato o calendario está inactivo.",
            )
        _validar_vigencia_calendario(contrato, calendario)

    relacion.activa = payload.activa
    relacion.updated_at = datetime.now(timezone.utc)
    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=relacion.contrato.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                "recurso": "contratos_calendarios",
                "accion": "modificar_estado",
                "entidad_id": str(relacion.id),
                "activa": relacion.activa,
            },
            trabajador_id=relacion.contrato.trabajador_id,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo actualizar la asociación contrato-calendario.",
        )

    return _obtener_relacion_o_404(db, relacion.id)


@router.delete(
    "/{id_relacion}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Desactivar una asociación contrato-calendario",
)
@limiter.limit("20/minute")
def desactivar_contrato_calendario(
    request: Request,
    id_relacion: UUID,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.ELIMINAR + "-" + TipoPermisoEnum.CONTRATOS_CALENDARIOS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **DELETE /api/contratos-calendarios/{id_relacion}**

    Desactiva la asociación sin borrar su registro.
    """
    relacion = _obtener_relacion_o_404(db, id_relacion)
    if not relacion.activa:
        return None

    relacion.activa = False
    relacion.updated_at = datetime.now(timezone.utc)
    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=relacion.contrato.empresa_id,
            accion=AccionAuditoriaEnum.BAJA_LOGICA,
            detalle={
                "recurso": "contratos_calendarios",
                "accion": "desactivar",
                "entidad_id": str(relacion.id),
            },
            trabajador_id=relacion.contrato.trabajador_id,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo desactivar la asociación contrato-calendario.",
        )
    return None
