from datetime import date
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session, joinedload

from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum, AccionPermisoEnum, AlcancePermisoEnum, TipoPermisoEnum
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from models.asignaciones_turno import AsignacionesTurno
from models.contratos import Contratos
from models.trabajadores import Trabajadores
from models.turnos import Turnos
from models.usuarios import Usuarios
from schemas.asignaciones_turno import (
    AsignacionTurnoCreate,
    AsignacionTurnoMasivaCreate,
    AsignacionTurnoResponse,
    AsignacionTurnoUpdate,
)

# APIRouter agrupa todos los endpoints relacionados con las asignaciones de turno bajo el prefijo "/api/asignaciones-turno".
router = APIRouter(prefix="/api/asignaciones-turno", tags=["Asignaciones de Turno"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "/contrato/{id_contrato}",
    response_model=List[AsignacionTurnoResponse],
    summary="Obtener asignaciones por contrato",
    description="Obtiene las asignaciones de turnos por contrato.",
)
def obtener_asignaciones_contrato(
    request: Request,
    id_contrato: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.ASIGNACIONES_TURNO+"-"+AlcancePermisoEnum.PROPIO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/asignaciones-turno/contrato/{id_contrato}**

    Obtiene las asignaciones de turnos por contrato.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de asignaciones de turno para el contrato ({id_contrato}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    contrato = db.query(Contratos).filter(Contratos.id == id_contrato).first()
    if not contrato:
        print(f"Contrato ({id_contrato}) no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Contrato no encontrado.")

    if (
        getattr(request.state, "alcance_efectivo", None) == AlcancePermisoEnum.PROPIO.value
        and db.query(Trabajadores.id).filter(
            Trabajadores.id == contrato.trabajador_id,
            Trabajadores.usuario_id == usuario_actual.id,
        ).first() is None
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato no encontrado.")

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=contrato.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "asignaciones_turno",
            'accion': "consultar_contrato",
        },
        trabajador_id=contrato.trabajador_id
    )
    db.commit()

    asignaciones = (
        db.query(AsignacionesTurno)
        .options(joinedload(AsignacionesTurno.empresa), joinedload(AsignacionesTurno.contrato), joinedload(AsignacionesTurno.turno))
        .filter(AsignacionesTurno.contrato_id == contrato.id)
        .all()
    )

    return asignaciones
@router.get(
    "/{id_asignacion}",
    response_model=List[AsignacionTurnoResponse],
    summary="Obtener asignación por id",
    description="Obtiene las asignaciones de turnos por contrato.",
)
def obtener_asignacion_id(
    request: Request,
    id_asignacion: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.ASIGNACIONES_TURNO+"-"+AlcancePermisoEnum.PROPIO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/asignaciones-turno/contrato/{id_contrato}**

    Obtiene las asignaciones de turnos por contrato.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de la asignacion de turno ({id_asignacion}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    asignacion = db.query(AsignacionesTurno).options(joinedload(AsignacionesTurno.empresa), joinedload(AsignacionesTurno.contrato), joinedload(AsignacionesTurno.turno)).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        print(f"Asignación de turno ({id_asignacion}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asiganción de turno no encontrada.")

    contrato = db.query(Contratos).filter(Contratos.id == asignacion.contrato_id).first()
    if not contrato:
        print(f"Contrato ({asignacion.contrato_id}) no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Contrato no encontrado.")

    if (
        getattr(request.state, "alcance_efectivo", None) == AlcancePermisoEnum.PROPIO.value
        and db.query(Trabajadores.id).filter(
            Trabajadores.id == contrato.trabajador_id,
            Trabajadores.usuario_id == usuario_actual.id,
        ).first() is None
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación de turno no encontrada.")

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=asignacion.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "asignaciones_turno",
            'accion': "consultar_id",
        },
        trabajador_id=contrato.trabajador_id
    )
    db.commit()

    return asignacion

@router.post(
    "/masiva",
    response_model=List[AsignacionTurnoResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Asignar masivamente turnos",
    description="Vincula múltiples turnos a un contrato.",
)
@limiter.limit("20/minute")
def asignar_turnos_masivamente(
    request: Request,
    payload: AsignacionTurnoMasivaCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR+"-"+TipoPermisoEnum.ASIGNACIONES_TURNO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **POST /api/asignaciones-turno/masiva**

    Vincula múltiples turnos a un contrato.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de asignación de turno masiva para el contrato ({payload.contrato_id}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    contrato = db.query(Contratos).filter(Contratos.id == payload.contrato_id).first()

    if not contrato:
        print(f"Contrato ({payload.contrato_id}) no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Contrato no encontrado.")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == contrato.trabajador_id).first()

    if not trabajador:
        print(f"Trabajador ({contrato.trabajador_id}) no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Trabajador no encontrado.")

    nuevas_asignaciones_ids = []

    try:
        for turno_id in payload.turnos_ids:
            # Validar que cada turno exista
            turno = db.query(Turnos).filter(
                Turnos.id == turno_id,
                Turnos.activo.is_(True),
            ).first()
            if not turno:
                print(f"Turno ({turno_id}) no encontrado.")
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Turno no encontrado.")
            if turno.empresa_id != contrato.empresa_id:
                print(f"El turno ({turno_id}) no pertenece a la empresa del contrato.")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"El turno no pertenece a la empresa del contrato.")

            nueva_asignacion = AsignacionesTurno(
                empresa_id=contrato.empresa_id,
                trabajador_id=trabajador.id,
                turno_id=turno_id,
                fecha_inicio=payload.fecha_inicio,
                fecha_fin=payload.fecha_fin
            )
            db.add(nueva_asignacion)
            db.flush()
            nuevas_asignaciones_ids.append(nueva_asignacion.id)

        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': "asignaciones_turno",
                'accion': "crear_masivamente",
            },
            trabajador_id=trabajador.id
        )
        db.commit()

        asignaciones_creadas = (
            db.query(AsignacionesTurno)
            .options(joinedload(AsignacionesTurno.empresa), joinedload(AsignacionesTurno.contrato), joinedload(AsignacionesTurno.turno))
            .filter(AsignacionesTurno.id.in_(nuevas_asignaciones_ids))
            .all()
        )

        print(f"Asignación masiva completada con éxito: {len(asignaciones_creadas)}.")
        return asignaciones_creadas
    except Exception as e:
        db.rollback()
        print(f"No se han podido crear las asignaciones de turnos: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se han podido crear las asignaciones de turnos."
        )

@router.post(
    "",
    response_model=AsignacionTurnoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Asignar turno a contrato",
    description="Vincula un turno a un contrato.",
)
@limiter.limit("20/minute")
def asignar_turno_contrato(
    request: Request,
    payload: AsignacionTurnoCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR+"-"+TipoPermisoEnum.ASIGNACIONES_TURNO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **POST /api/asignaciones-turno**

    Vincula un turno a un contrato.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de asignación de turno para el contrato ({payload.contrato_id}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    contrato = db.query(Contratos).filter(Contratos.id == payload.contrato_id).first()

    if not contrato:
        print(f"Contrato ({payload.contrato_id}) no encontrato.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Contrato no encontrato.")

    turno = db.query(Turnos).filter(
        Turnos.id == payload.turno_id,
        Turnos.activo.is_(True),
    ).first()

    if not turno:
        print(f"Turno ({payload.turno_id}) no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Turno no encontrado.")
    if turno.empresa_id != contrato.empresa_id:
        print(f"El turno ({payload.turno_id}) debe pertenecer a la empresa del contrato.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"El turno debe pertenecer a la empresa del contrato.")

    nueva_asignacion = AsignacionesTurno(
        empresa_id=contrato.empresa_id,
        contrato_id=contrato.id,
        turno_id=payload.turno_id,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin
    )

    try:
        db.add(nueva_asignacion)
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=contrato.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': "asignaciones_turno",
                'accion': "crear",
            },
            trabajador_id=contrato.trabajador_id
        )
        db.commit()

        asignacion_creada = (
            db.query(AsignacionesTurno)
            .options(joinedload(AsignacionesTurno.empresa), joinedload(AsignacionesTurno.contrato), joinedload(AsignacionesTurno.turno))
            .filter(AsignacionesTurno.id == nueva_asignacion.id)
            .first()
        )

        print(f"Asignación de turno creada con éxito ({nueva_asignacion.id}).")
        return asignacion_creada
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear la asignación de turno: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido crear la asignación de turno."
        )

@router.put(
    "/{id_asignacion}/finalizar",
    response_model=AsignacionTurnoResponse,
    summary="Finalizar vigencia de asignación de turno",
    description="Establece la fecha de vencimiento de una asignación de turno para permitir rotaciones horarias.",
)
@limiter.limit("20/minute")
def finalizar_vigencia_turno(
    request: Request,
    id_asignacion: UUID,
    fecha_fin: date,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.ASIGNACIONES_TURNO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/asignaciones-turno/{id_asignacion}/finalizar?fecha_fin=AAAA-MM-DD**

    Establece la fecha de vencimiento de una asignación de turno para permitir rotaciones horarias.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de finalización de vigencia para la asignación de turno ({id_asignacion}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        print(f"Asignación de turno ({id_asignacion}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asignación de turno no encontrada.")

    if asignacion.fecha_inicio > fecha_fin:
        print(f"Error de validación de fechas en asignación ({id_asignacion}): inicio posterior a fin.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de finalización no puede ser previa a la fecha de inicio del turno."
        )

    setattr(asignacion, "fecha_fin", fecha_fin)

    db.commit()

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=asignacion.empresa_id,
        accion=AccionAuditoriaEnum.BAJA_LOGICA,
        detalle={
            'recurso': "asignaciones_turno",
            'accion': "finalizar",
        },
        trabajador_id=asignacion.trabajador_id
    )
    db.commit()

    asignacion_actualizada = (
        db.query(AsignacionesTurno)
        .options(joinedload(AsignacionesTurno.empresa), joinedload(AsignacionesTurno.contrato), joinedload(AsignacionesTurno.turno))
        .filter(AsignacionesTurno.id == id_asignacion)
        .first()
    )

    print(f"Vigencia del turno {id_asignacion} finalizada correctamente.")
    return asignacion_actualizada


@router.put(
    "/{id_asignacion}/modificar",
    response_model=AsignacionTurnoResponse,
    summary="Modificar asignación de turno",
    description="Modifica los datos sobre una asignación de turno de un conrato.",
)
@limiter.limit("20/minute")
def modificar_asignacion_turno(
    request: Request,
    id_asignacion: UUID,
    payload: AsignacionTurnoUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.ASIGNACIONES_TURNO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/asignaciones-turno/{id_asignacion}/modificar

    Modifica los datos sobre una asignación de turno de un conrato.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación para la asignación de turno ({id_asignacion}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        print(f"Asignación de turno ({id_asignacion}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asignación de turno no encontrada.")

    # Validaciones de fechas
    if payload.fecha_inicio is not None:
        if payload.fecha_fin is not None:
            if payload.fecha_inicio.__gt__(payload.fecha_fin):
                print(f"Error de validación de fechas en asignación ({id_asignacion}): inicio posterior a fin.")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La fecha de finalización no puede ser previa a la fecha de inicio del turno."
                )
            setattr(asignacion, "fecha_inicio", payload.fecha_inicio)
    else:
        print(f"Error de validación de fechas en asignación ({id_asignacion}): inicio no definido.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La fecha de inicio debe definirse.")

    if payload.fecha_fin is not None:
        setattr(asignacion, "fecha_fin", payload.fecha_fin)

    db.commit()

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=asignacion.empresa_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={
            'recurso': "asignaciones_turno",
            'accion': "modificar",
        },
        trabajador_id=asignacion.trabajador_id
    )
    db.commit()

    asignacion_actualizada = (
        db.query(AsignacionesTurno)
        .options(joinedload(AsignacionesTurno.empresa), joinedload(AsignacionesTurno.contrato), joinedload(AsignacionesTurno.turno))
        .filter(AsignacionesTurno.id == id_asignacion)
        .first()
    )

    print(f"Asignación {id_asignacion} editada exitosamente.")
    return asignacion_actualizada

@router.delete(
    "/contrato/{id_contrato}",
    status_code=status.HTTP_200_OK,
    summary="Eliminar asignaciones del contrato",
    description="Elimina todas las asignaciones de turno vinculadas al contrato.",
)
def eliminar_asignaciones_contrato(
    request: Request,
    id_contrato: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.ELIMINAR+"-"+TipoPermisoEnum.ASIGNACIONES_TURNO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **DELETE /api/asignaciones-turno/contrato/{id_contrato}**

    Elimina todas las asignaciones de turno vinculadas al contrato.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición para eliminar las asignaciones de turno del contrato ({id_contrato}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    contrato = db.query(Contratos).filter(Contratos.id == id_contrato).first()
    if not contrato:
        print(f"Contrato ({id_contrato}) no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Contrato no encontrado.")

    try:
        asignaciones = db.query(AsignacionesTurno).filter(AsignacionesTurno.contrato_id == id_contrato).all()

        if not asignaciones:
            print(f"No se encontraron asignaciones de turno activas en el contrato ({id_contrato}).")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontraron asignaciones de turno activas en el contrato."
            )

        for asignacion in asignaciones:
            db.delete(asignacion)

        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=contrato.empresa_id,
            accion=AccionAuditoriaEnum.ELIMINACION,
            detalle={
                'recurso': "asignaciones_turno",
                'accion': "eliminar_contrato",
            },
            trabajador_id=contrato.trabajador_id
        )
        db.commit()

        print(f"Se han eliminado {len(asignaciones)} asignaciones de turno del contrato ({id_contrato}).")
        return {"detail": f"Se han eliminado {len(asignaciones)} asignaciones de turno del contrato."}
    except Exception as e:
        db.rollback()
        print(f"No se ha podido eliminar las asignaciones de turno del contrato ({id_contrato}): {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido eliminar las asignaciones de turno del contrato."
        )

@router.delete(
    "/{id_asignacion}",
    status_code=status.HTTP_200_OK,
    summary="Eliminar asignación de turno",
    description="Elimina una asignación de turno de un contrato.",
)
def eliminar_asignacion_turno(
    request: Request,
    id_asignacion: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.ELIMINAR+"-"+TipoPermisoEnum.ASIGNACIONES_TURNO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **DELETE /api/asignaciones-turno/{id_asignacion}**

    Elimina una asignación de turno de un contrato.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de eliminación de la asignación ({id_asignacion}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        print(f"Asignación de turno ({id_asignacion}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asignación de turno no encontrada.")


    db.delete(asignacion)
    db.commit()

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=asignacion.empresa_id,
        accion=AccionAuditoriaEnum.ELIMINACION,
        detalle={
            'recurso': "asignaciones_turno",
            'accion': "eliminar",
        },
        trabajador_id=asignacion.trabajador_id
    )
    db.commit()

    print(f"Asignación de turno {id_asignacion} eliminada correctamente.")
    return {"detail": f"Asignación de turno eliminada correctamente."}


