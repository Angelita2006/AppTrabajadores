from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
import hashlib
import ipaddress

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import and_, exists, func, or_
from sqlalchemy.orm import joinedload, Session

from core.auditoria import registrar_auditoria
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    TipoPermisoEnum,
)
from core.jornada import calcular_resumen_jornada
from core.security import (
    get_db_with_advanced_security,
    verificar_permisos_requeridos,
)
from core.utils import (
    calcular_distancia_metros,
    procesar_y_guardar_firma,
    validar_dia_laboral_o_marcar_extra,
)
from models.asignaciones_turno import AsignacionesTurno
from models.ausencias import Ausencias
from models.centros_trabajo import CentrosTrabajo
from models.correcciones_fichaje import CorreccionesFichaje
from models.empresas import Empresas
from models.fichajes import Fichajes
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from schemas.fichajes import FichajeCreate, FichajeResponse
from schemas.trabajadores import TrabajadorSimpleResponse

# APIRouter agrupa todos los endpoints relacionados con la gestión de fichajes bajo el prefijo "/api/fichajes".
router = APIRouter(prefix="/api/fichajes", tags=["Fichajes"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

FichajeSustituto = Fichajes.__table__.alias("fichaje_sustituto")

def filtro_fichajes_vigentes():
    return ~exists().where(
        FichajeSustituto.c.fichaje_sustituido_id == Fichajes.id
    )

@router.post(
    "",
    response_model=FichajeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar fichaje",
    description="Crea un nuevo fichaje para un trabajador, validando su ubicación GPS, festivos, ausencias, integridad de los datos y procesando una firma digital.",
)
@limiter.limit("30/minute")
def crear_fichaje(
    request: Request,
    payload: FichajeCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.FICHAJES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/fichajes**

    Crea un nuevo fichaje para un trabajador, validando su ubicación GPS, festivos, ausencias,
    integridad de los datos y procesando una firma digital.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de fichaje desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    trabajador = (
        db.query(Trabajadores).options(
        joinedload(Trabajadores.empresa))
        .filter(Trabajadores.id == payload.trabajador_id, Trabajadores.activo.is_(True))
        .first()
    )
    if not trabajador:
        print(f"Trabajador ({payload.trabajador_id}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado."
        )

    empresa = db.query(Empresas).filter(Empresas.id == payload.empresa_id).first()
    if not empresa:
        print(f"Empresa ({payload.empresa_id}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa no encontrada."
        )

    fecha_a_validar = payload.fecha_hora_dispositivo if payload.fecha_hora_dispositivo else datetime.now()

    ausencia_vigente = (
        db.query(Ausencias).filter(
        Ausencias.trabajador_id == payload.trabajador_id,
        Ausencias.fecha_inicio <= fecha_a_validar.date(),
        Ausencias.fecha_fin >= fecha_a_validar.date())
        .first()
    )
    if ausencia_vigente:
        print(f"El trabajador ({payload.trabajador_id}) tiene una ausencia activa para la fecha ({fecha_a_validar.date()}).")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ausencia: Consta una ausencia o periodo vacacional asignado para este día. No es posible registrar fichajes."
        )

    validacion_dia = validar_dia_laboral_o_marcar_extra(db, payload.trabajador_id, fecha_a_validar)

    forzar_extra_enviado = getattr(payload, "forzar_hora_extra", False)

    if validacion_dia.startswith("Festivo"):
        if not forzar_extra_enviado:
            print(f"Atención: El día seleccionado es festivo o no laborable ({validacion_dia}). Debe marcar la opción de forzar horas extra para continuar.")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Atención: El día seleccionado es festivo o no laborable ({validacion_dia}). Debe marcar la opción de forzar horas extra para continuar."
            )

    centro_trabajo = (
        db.query(CentrosTrabajo).options(
        joinedload(CentrosTrabajo.empresa))
        .filter(CentrosTrabajo.id == payload.centro_trabajo_id, CentrosTrabajo.activo.is_(True))
        .first()
    )
    if not centro_trabajo:
        print(f"Centro de trabajo ({payload.centro_trabajo_id}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Centro de trabajo no encontrado."
        )

    if centro_trabajo.latitud is not None and centro_trabajo.longitud is not None:
        if payload.latitud is None or payload.longitud is None:
            print("Se requiere obligatoriamente la ubicación GPS del dispositivo para validar el fichaje en este centro de trabajo.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere obligatoriamente la ubicación GPS del dispositivo para validar el fichaje en este centro de trabajo."
            )

        distancia = calcular_distancia_metros(
            float(centro_trabajo.latitud),
            float(centro_trabajo.longitud),
            float(payload.latitud),
            float(payload.longitud)
        )

        if distancia > 500:
            print(f"Ubicación fuera de rango. Te encuentras a {round(distancia, 2)} metros del centro de trabajo (el límite máximo permitido es de 500 metros).")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ubicación fuera de rango. Te encuentras a {round(distancia, 2)} metros del centro de trabajo (el límite máximo permitido es de 500 metros)."
            )

    ip_a_procesar = getattr(payload, "ip_address", None)
    if not ip_a_procesar and request.client:
        ip_a_procesar = request.client.host

    ip_int = None
    if ip_a_procesar:
        try:
            ip_int = int(ipaddress.ip_address(str(ip_a_procesar)))
        except ValueError:
            pass

    datos_crudos = f"{payload.trabajador_id}-{payload.empresa_id}-{payload.tipo_evento.value}-{fecha_a_validar.isoformat()}"
    sha256_calculado = hashlib.sha256(datos_crudos.encode('utf-8')).hexdigest()

    observaciones_finales = payload.observaciones
    if validacion_dia.startswith("Festivo") and getattr(payload, "forzar_hora_extra", False):
        prefijo_extra = f"[HORA EXTRA - {validacion_dia}]"
        observaciones_finales = f"{prefijo_extra} {payload.observaciones}" if payload.observaciones else prefijo_extra

    ruta_relativa_firma = None
    data_firma = getattr(payload, "firma_digital", None)

    if data_firma and isinstance(data_firma, str):
        try:
            ruta_relativa_firma = procesar_y_guardar_firma(data_firma)
        except Exception as e:
            print(f"No se pudo procesar la firma digital adjunta: {str(e)}.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='No se pudo procesar la firma digital adjunta.'
            )

    nuevo_fichaje = Fichajes(
        empresa_id=payload.empresa_id,
        trabajador_id=payload.trabajador_id,
        centro_trabajo_id=payload.centro_trabajo_id,
        tipo_evento=payload.tipo_evento,
        fecha_hora=fecha_a_validar,
        metodo_fichaje=payload.metodo_fichaje,
        origen=payload.origen,
        estado=payload.estado,
        hash_integridad=sha256_calculado,
        latitud=payload.latitud,
        longitud=payload.longitud,
        ip_address=ip_int,
        observaciones=observaciones_finales,
        fecha_hora_dispositivo=payload.fecha_hora_dispositivo or fecha_a_validar,
        dispositivo_id=payload.dispositivo_id,
        motivo_pausa_id=payload.motivo_pausa_id,
        firma_digital=ruta_relativa_firma
    )

    try:
        db.add(nuevo_fichaje)
        calcular_resumen_jornada(
            db,
            payload.empresa_id,
            payload.trabajador_id,
            fecha_a_validar.date(),
        )

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=payload.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': 'fichajes',
                'accion': 'crear',
            },
            trabajador_id=payload.trabajador_id,
        )

        db.commit()

        fichaje_creado = (
            db.query(Fichajes).options(
            joinedload(Fichajes.trabajador),
            joinedload(Fichajes.centro_trabajo),
            joinedload(Fichajes.empresa))
            .filter(Fichajes.id == nuevo_fichaje.id)
            .first()
        )

        return fichaje_creado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear el fichaje: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='No se ha podido crear el fichaje.'
        )


@router.get(
    "/trabajador/{id_trabajador}/empresa/{id_empresa}",
    response_model=List[FichajeResponse],
    summary="Obtener fichajes de trabajador por empresa",
    description="Obtiene los de un trabajador dentro de una empresa.",
)
@limiter.limit("60/minute")
def obtener_fichajes_trabajador_empresa(
    request: Request,
    id_trabajador: UUID,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.FICHAJES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/fichajes/trabajador/{id_trabajador}/empresa/{id_empresa}**

    Obtiene los de un trabajador dentro de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de fichajes del trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        print(f"Empresa ({id_empresa}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa no encontrada."
        )

    resultados = (
        db.query(Fichajes).options(
        joinedload(Fichajes.trabajador),
        joinedload(Fichajes.centro_trabajo))
        .filter(Fichajes.trabajador_id == id_trabajador, Fichajes.empresa_id == id_empresa, filtro_fichajes_vigentes())
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'fichajes',
            'accion': 'consultar_trabajador_empresa',
        },
        trabajador_id=id_trabajador,
    )
    db.commit()
    return resultados

@router.get(
    "/trabajador/{id_trabajador}/turno",
    response_model=List[FichajeResponse],
    summary="Obtener fichajes del turno actual",
    description="Obtiene los fichajes del turno del usuario actual.",
)
@limiter.limit("60/minute")
def obtener_fichajes_turno_actual(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.FICHAJES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /trabajador/{id_trabajador}/turno**

    Obtiene los fichajes del turno del usuario actual.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de fichajes por turno para el trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trabajador no encontrado."
        )

    hoy = date.today()

    asignaciones_vigentes = (
        db.query(AsignacionesTurno)
        .filter(
            AsignacionesTurno.trabajador_id == id_trabajador,
            AsignacionesTurno.fecha_inicio <= hoy,
            or_(AsignacionesTurno.fecha_fin.is_(None), AsignacionesTurno.fecha_fin >= hoy))
        .all()
    )

    if not asignaciones_vigentes:
        return []

    condiciones_rangos_fechas = []
    for asig in asignaciones_vigentes:
        condicion_asig = [func.date(Fichajes.fecha_hora_dispositivo) >= asig.fecha_inicio]
        if asig.fecha_fin:
            condicion_asig.append(func.date(Fichajes.fecha_hora_dispositivo) <= asig.fecha_fin)
        condiciones_rangos_fechas.append(and_(*condicion_asig))

    fichajes_turno = (
        db.query(Fichajes).options(
        joinedload(Fichajes.trabajador),
        joinedload(Fichajes.centro_trabajo))
        .filter(Fichajes.trabajador_id == id_trabajador, filtro_fichajes_vigentes(), or_(*condiciones_rangos_fechas))
        .order_by(Fichajes.fecha_hora_dispositivo.asc())
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'fichajes',
            'accion': 'consultar_turno_actual',
        },
        trabajador_id=id_trabajador,
    )
    db.commit()

    return fichajes_turno

@router.get(
    "/trabajador/{id_trabajador}/ultimo",
    response_model=Optional[FichajeResponse],
    summary="Obtener último fichaje del trabajador",
    description="Obtiene el último fichaje del trabajador.",
)
@limiter.limit("60/minute")
def obtener_ultimo_fichaje_trabajador(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.FICHAJES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/fichajes/trabajador/{trabajador_id}/ultimo**

    Obtiene el último fichaje del trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición del último fichaje para el trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado."
        )

    ultimo_fichaje = (
        db.query(Fichajes).options(
        joinedload(Fichajes.trabajador),
        joinedload(Fichajes.centro_trabajo))
        .filter(Fichajes.trabajador_id == id_trabajador)
        .order_by(Fichajes.created_at.desc())
        .first()
    )
    if not ultimo_fichaje:
        print(f"Último fichaje no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Último fichaje no encontrado."
        )
    
    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'fichajes',
            'accion': 'consultar_trabajador_ultimo',
        },
        trabajador_id=id_trabajador,
    )
    db.commit()

    return ultimo_fichaje

@router.get(
    "/empresa/{empresa_id}",
    status_code=status.HTTP_200_OK,
    summary="Obtener fichajes de empresa entre fechas",
    description="Obtener los fichajes de una empresa entre fechas específicas.",
)
@limiter.limit("60/minute")
def obtener_fichajes_empresa_entre_fechas(
    request: Request,
    empresa_id: UUID,
    fecha_inicio: date,
    fecha_fin: date,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.FICHAJES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/fichajes/empresa/{empresa_id}**

    Obtener los fichajes de una empresa entre fechas específicas.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de fichajes por empresa entre fechas desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    try:
        resultados = (
            db.query(Fichajes).options(
            joinedload(Fichajes.trabajador),
            joinedload(Fichajes.centro_trabajo))
            .filter(Fichajes.empresa_id == empresa_id, func.date(Fichajes.fecha_hora_dispositivo) >= fecha_inicio, func.date(Fichajes.fecha_hora_dispositivo) <= fecha_fin)
            .all()
        )

        fichaje_ids = [fichaje.id for fichaje in resultados]
        correcciones_aprobadas = {}
        if fichaje_ids:
            correcciones = (
                db.query(CorreccionesFichaje).options(
                joinedload(CorreccionesFichaje.usuario_solicitador),
                joinedload(CorreccionesFichaje.usuario_aprobador))
                .filter(CorreccionesFichaje.fichaje_afectado_id.in_(fichaje_ids), CorreccionesFichaje.estado == 'Aprobada')
                .all()
            )
            correcciones_aprobadas = {
                correccion.fichaje_afectado_id: correccion
                for correccion in correcciones
            }

        payload_respuesta = []
        for fichaje in resultados:
            if fichaje.fecha_hora_dispositivo:
                fecha_hora_str = fichaje.fecha_hora_dispositivo.strftime("%Y-%m-%d %H:%M:%S")
            else:
                fecha_hora_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            trabajador_serializado = None
            if fichaje.trabajador:
                trabajador_serializado = TrabajadorSimpleResponse.model_validate(fichaje.trabajador).model_dump()

            correccion = correcciones_aprobadas.get(fichaje.id)
            correccion_serializada = None
            if correccion:
                correccion_serializada = {
                    "id": str(correccion.id),
                    "tipo_correccion": correccion.tipo_correccion,
                    "motivo": correccion.motivo,
                    "fecha_solicitud": correccion.fecha_solicitud.isoformat(),
                    "fecha_resolucion": correccion.fecha_resolucion.isoformat() if correccion.fecha_resolucion else None,
                    "valor_nuevo": correccion.valor_nuevo,
                    "firma_solicitante": correccion.firma_solicitante,
                    "firma_resolutor": correccion.firma_resolutor,
                    "solicitante": correccion.usuario_solicitador,
                    "resolutor": correccion.usuario_aprobador,
                }

            payload_respuesta.append({
                "id": str(fichaje.id),
                "trabajador_id": str(fichaje.trabajador_id),
                "trabajador": trabajador_serializado,
                "correccion_aprobada": correccion_serializada,
                "fecha_hora": fecha_hora_str,
                "tipo_evento": fichaje.tipo_evento,
                "metodo_fichaje": fichaje.metodo_fichaje,
                "observaciones": fichaje.observaciones,
                "estado": fichaje.estado,
                "firma_digital": fichaje.firma_digital
            })

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=empresa_id,
            accion=AccionAuditoriaEnum.CONSULTA,
            detalle={
                'recurso': 'fichajes',
                'accion': 'consultar_empresa_entre_fechas',
            },
            trabajador_id=None,
        )
        db.commit()

        return payload_respuesta

    except Exception as e:
        db.rollback()
        print(f"No se han podido obtener los fichajes de la empresa entre esas fechas: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='No se han podido obtener los fichajes de la empresa entre esas fechas.'
        )

@router.get(
    "/trabajador/{trabajador_id}",
    status_code=status.HTTP_200_OK,
    summary="Obtener fichajes de trabajador entre fechas",
    description="Obtiene los fichajes de un trabajador entre fechas específicas.",
)
@limiter.limit("60/minute")
def obtener_fichajes_trabajador_entre_fechas(
    request: Request,
    id_trabajador: UUID,
    fecha_inicio: date,
    fecha_fin: date,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.FICHAJES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/fichajes/trabajador/{trabajador_id}**

    Obtiene los fichajes de un trabajador entre fechas específicas.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de fichajes por trabajador entre fechas desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    try:
        resultados = (
            db.query(Fichajes).options(
            joinedload(Fichajes.trabajador),
            joinedload(Fichajes.centro_trabajo))
            .filter(Fichajes.trabajador_id == id_trabajador, func.date(Fichajes.fecha_hora_dispositivo) >= fecha_inicio, func.date(Fichajes.fecha_hora_dispositivo) <= fecha_fin)
            .all()
        )

        fichaje_ids = [fichaje.id for fichaje in resultados]
        correcciones_aprobadas = {}
        if fichaje_ids:
            correcciones = (
                db.query(CorreccionesFichaje).options(
                joinedload(CorreccionesFichaje.solicitado_por_usuario),
                joinedload(CorreccionesFichaje.aprobado_por_usuario))
                .filter(CorreccionesFichaje.fichaje_afectado_id.in_(fichaje_ids), CorreccionesFichaje.estado == 'Aprobada')
                .all()
            )
            correcciones_aprobadas = {
                correccion.fichaje_afectado_id: correccion
                for correccion in correcciones
            }

        payload_respuesta = []
        for fichaje in resultados:
            if fichaje.fecha_hora_dispositivo:
                fecha_hora_str = fichaje.fecha_hora_dispositivo.strftime("%Y-%m-%d %H:%M:%S")
            else:
                fecha_hora_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            trabajador_serializado = None
            if fichaje.trabajador:
                trabajador_serializado = TrabajadorSimpleResponse.model_validate(fichaje.trabajador).model_dump()

            correccion = correcciones_aprobadas.get(fichaje.id)
            correccion_serializada = None
            if correccion:
                correccion_serializada = {
                    "id": str(correccion.id),
                    "tipo_correccion": correccion.tipo_correccion,
                    "motivo": correccion.motivo,
                    "fecha_solicitud": correccion.fecha_solicitud.isoformat(),
                    "fecha_resolucion": correccion.fecha_resolucion.isoformat() if correccion.fecha_resolucion else None,
                    "valor_nuevo": correccion.valor_nuevo,
                    "firma_solicitante": correccion.firma_solicitante,
                    "firma_resolutor": correccion.firma_resolutor,
                    "solicitante": correccion.usuario_solicitador,
                    "resolutor": correccion.usuario_aprobador,
                }

            payload_respuesta.append({
                "id": str(fichaje.id),
                "trabajador_id": str(fichaje.trabajador_id),
                "trabajador": trabajador_serializado,
                "correccion_aprobada": correccion_serializada,
                "fecha_hora": fecha_hora_str,
                "tipo_evento": fichaje.tipo_evento,
                "metodo_fichaje": fichaje.metodo_fichaje,
                "observaciones": fichaje.observaciones,
                "estado": fichaje.estado,
                "firma_digital": fichaje.firma_digital
            })

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=request.headers.get('Empresa-ID'),
            accion=AccionAuditoriaEnum.CONSULTA,
            detalle={
                'recurso': 'fichajes',
                'accion': 'consultar_trabajador_entre_fechas',
            },
            trabajador_id=id_trabajador,
        )
        db.commit()

        return payload_respuesta

    except Exception as e:
        db.rollback()
        print(f"No se han podido obtener los fichajes del trabajador entre esas fechas: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='No se han podido obtener los fichajes del trabajador entre esas fechas.'
        )


@router.get(
    "/{id_fichaje}",
    response_model=FichajeResponse,
    summary="Obtener fichaje por id",
    description="Obtiene el fichaje por su id.",
)
@limiter.limit("60/minute")
def obtener_fichaje(
    request: Request,
    id_fichaje: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.FICHAJES])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/fichajes/{id_fichaje}**

    Obtiene el fichaje por su id.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle del fichaje ({id_fichaje}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    fichaje = (
        db.query(Fichajes).options(
        joinedload(Fichajes.trabajador),
        joinedload(Fichajes.centro_trabajo))
        .filter(Fichajes.id == id_fichaje)
        .first()
    )

    if not fichaje:
        print(f"Fichaje ({id_fichaje}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fichaje no encontrado."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=fichaje.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'fichajes',
            'accion': 'consultar_id',
        },
        trabajador_id=fichaje.trabajador_id,
    )
    db.commit()

    return fichaje
