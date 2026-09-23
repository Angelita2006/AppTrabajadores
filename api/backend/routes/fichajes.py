import base64
from datetime import date, datetime
import hashlib
import ipaddress
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import exists, func
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.ausencias import Ausencias
from models.asignaciones_turno import AsignacionesTurno
from models.centros_trabajo import CentrosTrabajo
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import EstadoFichajeEnum, MetodoFichajeEnum, OrigenFichajeEnum, TipoUsuarioEnum
from core.utils import calcular_distancia_metros, procesar_y_guardar_firma, validar_dia_laboral_o_marcar_extra
from models.empresas import Empresas
from models.fichajes import Fichajes
from models.correcciones_fichaje import CorreccionesFichaje
from models.usuarios import Usuarios
from schemas.fichajes import FichajeCreate, FichajeResponse
from models.tipos_evento_fichaje import TiposEventoFichaje
from models.trabajadores import Trabajadores
from models.turnos import Turnos
from core.jornada import recalcular_resumen_jornada
from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum
from schemas.trabajadores import TrabajadorSimpleResponse

# APIRouter agrupa todos los endpoints relacionados con la gestión de fichajes bajo el prefijo "/api/fichajes".
router = APIRouter(prefix="/api/fichajes", tags=["Fichajes"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
# Esto previene ataques de fuerza bruta o saturación de peticiones en rutas críticas.
limiter = Limiter(key_func=get_remote_address)

FichajeSustituto = Fichajes.__table__.alias("fichaje_sustituto")

def filtro_fichajes_vigentes():
    return ~exists().where(
        FichajeSustituto.c.fichaje_sustituido_id == Fichajes.id
    )
@router.post("", response_model=FichajeResponse, status_code=status.HTTP_201_CREATED, summary="Registrar fichaje")
@limiter.limit("30/minute")
def crear_fichaje(
    request: Request,
    obj_in: FichajeCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **POST /api/fichajes**
     
    Registra un nuevo fichaje para un trabajador, validando su ubicación GPS, festivos,
    integridad de los datos mediante hash SHA-256 y opcionalmente procesando una firma digital.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de fichaje desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).options(
        joinedload(Trabajadores.empresa)
    ).filter(Trabajadores.id == obj_in.trabajador_id, Trabajadores.activo.is_(True)).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"No se ha encontrado el trabajador con ID ({obj_in.trabajador_id}). Verifique los datos."
        )
    
    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"No se ha encontrado la empresa con ID ({obj_in.empresa_id}). Verifique los datos."
        )

    if usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Acceso denegado. No tienes permisos para registrar fichajes en esta empresa."
        )

    fecha_a_validar = obj_in.fecha_hora_dispositivo if obj_in.fecha_hora_dispositivo else datetime.now()

    # Obtener la ausencia vigente en el día si existe
    ausencia_vigente = db.query(Ausencias).filter(
        Ausencias.trabajador_id == obj_in.trabajador_id,
        Ausencias.fecha_inicio <= fecha_a_validar.date(),
        Ausencias.fecha_fin >= fecha_a_validar.date()
    ).first()

    if ausencia_vigente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ausencia: Consta una ausencia o periodo vacacional asignado para este día. No es posible registrar fichajes."
        )

    validacion_dia = validar_dia_laboral_o_marcar_extra(db, obj_in.trabajador_id, fecha_a_validar)

    forzar_extra_enviado = getattr(obj_in, "forzar_hora_extra", False)

    if validacion_dia.startswith("Festivo"):
        if not forzar_extra_enviado:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Atención: El día seleccionado es festivo o no laborable ({validacion_dia}). Debe marcar la opción de forzar horas extra para continuar."
            )

    centro_trabajo = db.query(CentrosTrabajo).options(
        joinedload(CentrosTrabajo.empresa)
    ).filter(CentrosTrabajo.id == obj_in.centro_trabajo_id, CentrosTrabajo.activo.is_(True)).first()
    if not centro_trabajo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="El centro de trabajo especificado no existe en el sistema."
        )

    if centro_trabajo.latitud is not None and centro_trabajo.longitud is not None:
        if obj_in.latitud is None or obj_in.longitud is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere obligatoriamente la ubicación GPS del dispositivo para validar el fichaje en este centro de trabajo."
            )
        
        distancia = calcular_distancia_metros(
            float(centro_trabajo.latitud), 
            float(centro_trabajo.longitud),
            float(obj_in.latitud), 
            float(obj_in.longitud)
        )

        if distancia > 500:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ubicación fuera de rango. Te encuentras a {round(distancia, 2)} metros del centro de trabajo (el límite máximo permitido es de 500 metros)."
            )

    tipo_evento_obj = db.query(TiposEventoFichaje).filter(
        TiposEventoFichaje.id == obj_in.tipo_evento_id,
        TiposEventoFichaje.activo.is_(True),
    ).first()
    if not tipo_evento_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El tipo de evento de fichaje indicado no es válido o no existe en la base de datos."
        )
    id_real_evento = tipo_evento_obj.id

    ip_a_procesar = getattr(obj_in, "ip_address", None)
    if not ip_a_procesar and request.client:
        ip_a_procesar = request.client.host

    ip_int = None
    if ip_a_procesar:
        try:
            ip_int = int(ipaddress.ip_address(str(ip_a_procesar)))
        except ValueError:
            pass

    datos_crudos = f"{obj_in.trabajador_id}-{obj_in.empresa_id}-{id_real_evento}-{fecha_a_validar.isoformat()}"
    sha256_calculado = hashlib.sha256(datos_crudos.encode('utf-8')).hexdigest()

    observaciones_finales = obj_in.observaciones
    if validacion_dia.startswith("Festivo") and getattr(obj_in, "forzar_hora_extra", False):
        prefijo_extra = f"[HORA EXTRA - {validacion_dia}]"
        observaciones_finales = f"{prefijo_extra} {obj_in.observaciones}" if obj_in.observaciones else prefijo_extra

    ruta_relativa_firma = None
    data_firma = getattr(obj_in, "firma_digital", None)

    if data_firma and isinstance(data_firma, str):
        try:
            ruta_relativa_firma = procesar_y_guardar_firma(data_firma)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se pudo procesar la imagen de la firma digital adjunta: {str(e)}"
            )

    nuevo_fichaje = Fichajes(
        empresa_id=obj_in.empresa_id,
        trabajador_id=obj_in.trabajador_id,
        centro_trabajo_id=obj_in.centro_trabajo_id,
        tipo_evento_id=id_real_evento,
        fecha_hora=fecha_a_validar,
        metodo_fichaje=MetodoFichajeEnum(obj_in.metodo_fichaje) if isinstance(obj_in.metodo_fichaje, str) else obj_in.metodo_fichaje,
        origen=OrigenFichajeEnum(obj_in.origen) if hasattr(obj_in, 'origen') and obj_in.origen else OrigenFichajeEnum.TRABAJADOR,
        estado=EstadoFichajeEnum(obj_in.estado) if hasattr(obj_in, 'estado') and obj_in.estado else EstadoFichajeEnum.VALIDO,
        hash_integridad=sha256_calculado,
        latitud=obj_in.latitud,
        longitud=obj_in.longitud,
        ip_address=ip_int,
        observaciones=observaciones_finales,
        fecha_hora_dispositivo=obj_in.fecha_hora_dispositivo or fecha_a_validar,
        dispositivo_id=getattr(obj_in, "dispositivo_id", None),
        motivo_pausa_id=obj_in.motivo_pausa_id,
        firma_digital=ruta_relativa_firma
    )
    
    try:
        db.add(nuevo_fichaje)
        recalcular_resumen_jornada(
            db,
            obj_in.empresa_id,
            obj_in.trabajador_id,
            fecha_a_validar.date(),
        )
        
        # Registro de auditoría para la creación del fichaje
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=obj_in.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "fichajes", "accion": "crear_fichaje", "entidad_id": str(nuevo_fichaje.id), "detalles": f"Se ha registrado un nuevo fichaje para el trabajador {obj_in.trabajador_id}"}
        )

        db.commit()
        
        fichaje_creado = db.query(Fichajes).options(
            joinedload(Fichajes.tipo_evento),
            joinedload(Fichajes.trabajador),
            joinedload(Fichajes.centro_trabajo),
            joinedload(Fichajes.empresa)
        ).filter(Fichajes.id == nuevo_fichaje.id).first()
        
        return fichaje_creado
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido guardar el fichaje en la base de datos: {str(e)}"
        )


@router.get("/trabajador/{id_trabajador}/empresa/{id_empresa}", response_model=List[FichajeResponse], summary="Obtener fichajes de trabajador por empresa")
@limiter.limit("60/minute") 
def obtener_fichajes_trabajador_empresa(
    request: Request,
    id_trabajador: UUID, 
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/fichajes/trabajador/{id_trabajador}/empresa/{id_empresa}**
     
    Devuelve la lista completa de fichajes asociados a un trabajador específico dentro de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de fichajes del trabajador {id_trabajador} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El trabajador con ID ({id_trabajador}) no fue encontrado."
        )
    
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La empresa con ID ({id_empresa}) no fue encontrada."
        )

    resultados = db.query(Fichajes).options(
        joinedload(Fichajes.tipo_evento),
        joinedload(Fichajes.trabajador),
        joinedload(Fichajes.centro_trabajo)
    ).filter(
        Fichajes.trabajador_id == id_trabajador,
        Fichajes.empresa_id == id_empresa,
        filtro_fichajes_vigentes(),
    ).all()
    
    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "fichajes", "accion": "consultar_por_trabajador_empresa", "entidad_id": str(id_trabajador), "detalles": f"Se consultaron los fichajes del trabajador {id_trabajador} en la empresa {id_empresa}"}
    )
    db.commit()
    return resultados
from datetime import date
from sqlalchemy import or_, and_

@router.get("/trabajador/{id_trabajador}/turno", response_model=List[FichajeResponse], summary="Obtener fichajes del turno actual")
@limiter.limit("60/minute") 
def obtener_fichajes_turno_actual(
    request: Request,
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de fichajes por turno para el trabajador {id_trabajador} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trabajador no localizado."
        )

    hoy = date.today()

    # 1. Buscar TODAS las asignaciones de turno que están vigentes a día de hoy para el trabajador
    asignaciones_vigentes = (
        db.query(AsignacionesTurno)
        .filter(
            AsignacionesTurno.trabajador_id == id_trabajador,
            AsignacionesTurno.fecha_inicio <= hoy,
            or_(
                AsignacionesTurno.fecha_fin.is_(None),
                AsignacionesTurno.fecha_fin >= hoy
            )
        )
        .all()
    )

    if not asignaciones_vigentes:
        return []

    # 2. Construir los rangos de fechas (fecha_inicio a fecha_fin) de las asignaciones activas
    condiciones_rangos_fechas = []
    for asig in asignaciones_vigentes:
        condicion_asig = [func.date(Fichajes.fecha_hora_dispositivo) >= asig.fecha_inicio]
        if asig.fecha_fin:
            condicion_asig.append(func.date(Fichajes.fecha_hora_dispositivo) <= asig.fecha_fin)
        condiciones_rangos_fechas.append(and_(*condicion_asig))

    # 3. Consultar fichajes que caigan dentro de CUALQUIERA de las asignaciones vigentes
    fichajes_turno = (
        db.query(Fichajes)
        .options(
            joinedload(Fichajes.tipo_evento),
            joinedload(Fichajes.trabajador),
            joinedload(Fichajes.centro_trabajo)
        )
        .filter(
            Fichajes.trabajador_id == id_trabajador,
            filtro_fichajes_vigentes(),
            or_(*condiciones_rangos_fechas)
        )
        .order_by(Fichajes.fecha_hora_dispositivo.asc())
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            "recurso": "fichajes", 
            "accion": "consultar_fichajes_turno", 
            "entidad_id": str(id_trabajador), 
            "detalles": f"Se consultaron los fichajes del turno actual para el trabajador {id_trabajador}"
        }
    )
    db.commit()

    return fichajes_turno


@router.get("/trabajador/{id_trabajador}/ultimo", response_model=Optional[FichajeResponse], summary="Obtener último fichaje del trabajador")
@limiter.limit("60/minute")
def obtener_ultimo_fichaje_trabajador(
    request: Request,
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/fichajes/trabajador/{trabajador_id}/ultimo**
     
    Devuelve estrictamente el último evento de fichaje registrado por el trabajador (ordenado de forma descendente).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición del último fichaje para el trabajador {id_trabajador} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID ({id_trabajador}) no encontrado."
        )

    ultimo_fichaje = db.query(Fichajes).options(
        joinedload(Fichajes.tipo_evento),
        joinedload(Fichajes.trabajador),
        joinedload(Fichajes.centro_trabajo)
    ).filter(
        Fichajes.trabajador_id == id_trabajador
    ).order_by(Fichajes.created_at.desc()).first()
    
    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "fichajes", "accion": "consultar_ultimo_fichaje", "entidad_id": str(id_trabajador), "detalles": f"Se consultó el último fichaje del trabajador {id_trabajador}"}
    )
    db.commit()

    if not ultimo_fichaje:
        return None
        
    return ultimo_fichaje

@router.get("/empresa/{empresa_id}", status_code=status.HTTP_200_OK, summary="Listar fichajes de empresa entre fechas")
@limiter.limit("60/minute")
def listar_fichajes_empresa_entre_fechas(
    request: Request,
    empresa_id: UUID, 
    fecha_inicio: date, 
    fecha_fin: date, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/fichajes/empresa/{empresa_id}**
     
    Lista detallada de todos los fichajes de una empresa para una fecha específica,
    adaptada y formateada para el consumo directo del frontend. Protegida por roles administrativos.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de fichajes por empresa y fecha desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    try:
        resultados = (
            db.query(Fichajes)
            .options(
                joinedload(Fichajes.trabajador),
                joinedload(Fichajes.tipo_evento),
                joinedload(Fichajes.centro_trabajo)
            )
            .filter(
                Fichajes.empresa_id == empresa_id,
                func.date(Fichajes.fecha_hora_dispositivo) >= fecha_inicio, func.date(Fichajes.fecha_hora_dispositivo) <= fecha_fin
            )
            .all()
        )

        fichaje_ids = [fichaje.id for fichaje in resultados]
        correcciones_aprobadas = {}
        if fichaje_ids:
            correcciones = db.query(CorreccionesFichaje).options(
                joinedload(CorreccionesFichaje.solicitado_por_usuario),
                joinedload(CorreccionesFichaje.aprobado_por_usuario),
            ).filter(
                CorreccionesFichaje.fichaje_afectado_id.in_(fichaje_ids),
                CorreccionesFichaje.estado == "Aprobada",
            ).all()
            correcciones_aprobadas = {
                correccion.fichaje_afectado_id: correccion
                for correccion in correcciones
            }

        payload_respuesta = []
        for fichaje in resultados:
            codigo_evento = ""
            if fichaje.tipo_evento:
                codigo_evento = getattr(fichaje.tipo_evento, "codigo", "")

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
                    "tipo_correccion": correccion.tipo_correccion.value,
                    "motivo": correccion.motivo,
                    "fecha_solicitud": correccion.fecha_solicitud.isoformat(),
                    "fecha_resolucion": correccion.fecha_resolucion.isoformat() if correccion.fecha_resolucion else None,
                    "valor_nuevo": correccion.valor_nuevo,
                    "firma_solicitante": correccion.firma_solicitante,
                    "firma_resolutor": correccion.firma_resolutor,
                    "solicitante": getattr(correccion.solicitado_por_usuario, "nombre", None),
                    "resolutor": getattr(correccion.aprobado_por_usuario, "nombre", None),
                    "solicitante_tipo": getattr(correccion.solicitado_por_usuario, "tipo_usuario", None) if getattr(correccion.solicitado_por_usuario, "tipo_usuario", None) else None,
                    "resolutor_tipo": getattr(correccion.aprobado_por_usuario, "tipo_usuario", None) if getattr(correccion.aprobado_por_usuario, "tipo_usuario", None) else None,
                }

            payload_respuesta.append({
                "id": str(fichaje.id),
                "trabajador_id": str(fichaje.trabajador_id),
                "trabajador": trabajador_serializado,
                "correccion_aprobada": correccion_serializada,
                "codigo_evento_resuelto": codigo_evento.upper() if codigo_evento else "",
                "fecha_hora": fecha_hora_str, 
                "tipo_evento_id": str(fichaje.tipo_evento_id) if fichaje.tipo_evento_id else None,
                "metodo_fichaje": str(fichaje.metodo_fichaje.value) if hasattr(fichaje.metodo_fichaje, "value") else str(fichaje.metodo_fichaje),
                "observaciones": fichaje.observaciones,
                "estado": fichaje.estado.value if hasattr(fichaje.estado, "value") else str(fichaje.estado),
                "firma_digital": fichaje.firma_digital
            })

        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=empresa_id,
            accion=AccionAuditoriaEnum.CONSULTA,
            detalle={"recurso": "fichajes", "accion": "listar_fichajes_empresa_por_fecha", "entidad_id": str(empresa_id), "detalles": f"Se listaron los fichajes de la empresa {empresa_id} para el período entre las fechas {fecha_inicio} - {fecha_fin}"}
        )
        db.commit()

        return payload_respuesta

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se han podido obtener los fichajes de la empresa: {str(e)}"
        )

@router.get("/trabajador/{trabajador_id}", status_code=status.HTTP_200_OK, summary="Listar fichajes de trabajador entre fechas")
@limiter.limit("60/minute")
def listar_fichajes_trabajador_entre_fechas(
    request: Request,
    trabajador_id: UUID, 
    fecha_inicio: date, 
    fecha_fin: date, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/fichajes/trabajador/{trabajador_id}**
     
    Lista detallada de todos los fichajes de un trabajador para un período entre fechas específico,
    adaptada y formateada para el consumo directo del frontend. Protegida por roles administrativos.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de fichajes por trabajador entre fechas desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    try:
        resultados = (
            db.query(Fichajes)
            .options(
                joinedload(Fichajes.trabajador),
                joinedload(Fichajes.tipo_evento),
                joinedload(Fichajes.centro_trabajo)
            )
            .filter(
                Fichajes.trabajador_id == trabajador_id,
                func.date(Fichajes.fecha_hora_dispositivo) >= fecha_inicio, func.date(Fichajes.fecha_hora_dispositivo) <= fecha_fin
            )
            .all()
        )

        fichaje_ids = [fichaje.id for fichaje in resultados]
        correcciones_aprobadas = {}
        if fichaje_ids:
            correcciones = db.query(CorreccionesFichaje).options(
                joinedload(CorreccionesFichaje.solicitado_por_usuario),
                joinedload(CorreccionesFichaje.aprobado_por_usuario),
            ).filter(
                CorreccionesFichaje.fichaje_afectado_id.in_(fichaje_ids),
                CorreccionesFichaje.estado == "Aprobada",
            ).all()
            correcciones_aprobadas = {
                correccion.fichaje_afectado_id: correccion
                for correccion in correcciones
            }

        payload_respuesta = []
        for fichaje in resultados:
            codigo_evento = ""
            if fichaje.tipo_evento:
                codigo_evento = getattr(fichaje.tipo_evento, "codigo", "")

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
                    "tipo_correccion": correccion.tipo_correccion.value,
                    "motivo": correccion.motivo,
                    "fecha_solicitud": correccion.fecha_solicitud.isoformat(),
                    "fecha_resolucion": correccion.fecha_resolucion.isoformat() if correccion.fecha_resolucion else None,
                    "valor_nuevo": correccion.valor_nuevo,
                    "firma_solicitante": correccion.firma_solicitante,
                    "firma_resolutor": correccion.firma_resolutor,
                    "solicitante": getattr(correccion.solicitado_por_usuario, "nombre", None),
                    "resolutor": getattr(correccion.aprobado_por_usuario, "nombre", None),
                    "solicitante_tipo": getattr(correccion.solicitado_por_usuario, "tipo_usuario", None) if getattr(correccion.solicitado_por_usuario, "tipo_usuario", None) else None,
                    "resolutor_tipo": getattr(correccion.aprobado_por_usuario, "tipo_usuario", None) if getattr(correccion.aprobado_por_usuario, "tipo_usuario", None) else None,
                }

            payload_respuesta.append({
                "id": str(fichaje.id),
                "trabajador_id": str(fichaje.trabajador_id),
                "trabajador": trabajador_serializado,
                "correccion_aprobada": correccion_serializada,
                "codigo_evento_resuelto": codigo_evento.upper() if codigo_evento else "",
                "fecha_hora": fecha_hora_str, 
                "tipo_evento_id": str(fichaje.tipo_evento_id) if fichaje.tipo_evento_id else None,
                "metodo_fichaje": str(fichaje.metodo_fichaje.value) if hasattr(fichaje.metodo_fichaje, "value") else str(fichaje.metodo_fichaje),
                "observaciones": fichaje.observaciones,
                "estado": fichaje.estado.value if hasattr(fichaje.estado, "value") else str(fichaje.estado),
                "firma_digital": fichaje.firma_digital
            })

        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=usuario_actual.empresa_id
            ,
            accion=AccionAuditoriaEnum.CONSULTA,
            detalle={"recurso": "fichajes", "accion": "listar_fichajes_trabajador_entre_fechas", "entidad_id": str(usuario_actual.empresa_id), "detalles": f"Se listaron los fichajes del trabajador {trabajador_id} para el período entre las fechas {fecha_inicio} - {fecha_fin}"}
        )
        db.commit()

        return payload_respuesta

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se han podido obtener los fichajes de la empresa: {str(e)}"
        )


@router.get("/{id_fichaje}", response_model=FichajeResponse, summary="Obtener fichaje por ID")
@limiter.limit("60/minute") 
def obtener_fichaje(
    request: Request,
    id_fichaje: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.RRHH, TipoUsuarioEnum.AUDITOR_ITSS]))
):
    """
    **GET /api/fichajes/{id_fichaje}**
     
    Obtiene los detalles completos de un fichaje a partir de su ID único universal.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle del fichaje {id_fichaje} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    fichaje = db.query(Fichajes).options(
        joinedload(Fichajes.tipo_evento),
        joinedload(Fichajes.trabajador),
        joinedload(Fichajes.centro_trabajo)
    ).filter(Fichajes.id == id_fichaje).first()
    
    if not fichaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El fichaje con ID ({id_fichaje}) no existe."
        )
    
    if usuario_actual.empresa_id != fichaje.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para visualizar este registro de fichaje."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=fichaje.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "fichajes", "accion": "consultar_fichaje_por_id", "entidad_id": str(id_fichaje), "detalles": f"Se consultaron los detalles del fichaje {id_fichaje}"}
    )
    db.commit()

    return fichaje


@router.patch("/{id_fichaje}/validar", response_model=FichajeResponse, status_code=status.HTTP_200_OK, summary="Validar fichaje")
@limiter.limit("30/minute") 
def validar_fichaje(
    request: Request,
    id_fichaje: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PATCH /api/fichajes/{id_fichaje}/validar**
     
    Cambia el estado de un fichaje a Válido y recalcula su hash de seguridad.
    Exclusivo para administradores de empresa o gestoría.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de validación del fichaje {id_fichaje} desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    fichaje = db.query(Fichajes).filter(Fichajes.id == id_fichaje).first()
    if not fichaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el registro de fichaje solicitado con ID {id_fichaje}."
        )

    if usuario_actual.tipo_usuario != TipoUsuarioEnum.ADMIN_GESTORIA and usuario_actual.empresa_id != fichaje.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para validar fichajes correspondientes a otra empresa."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=fichaje.empresa_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={"recurso": "fichajes", "accion": "intento_validacion_fichaje", "entidad_id": str(id_fichaje), "detalles": f"Intento de validación directa del fichaje inmutable {id_fichaje}"}
    )
    db.commit()

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Los fichajes son inmutables. La validación debe realizarse mediante una corrección aprobada.",
    )


@router.delete("/{id_fichaje}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar fichaje")
@limiter.limit("20/minute") 
def eliminar_fichaje(
    request: Request,
    id_fichaje: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **DELETE /api/fichajes/{id_fichaje}**
     
    Elimina un registro de fichaje existente. Requiere privilegios administrativos
    de gestoría o empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de eliminación del fichaje {id_fichaje} desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    fichaje = db.query(Fichajes).filter(Fichajes.id == id_fichaje).first()
    if not fichaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="El registro de fichaje que intentas eliminar no ha sido encontrado."
        )
    
    if usuario_actual.tipo_usuario != TipoUsuarioEnum.ADMIN_GESTORIA and usuario_actual.empresa_id != fichaje.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para eliminar registros de fichaje de otra empresa."
        )
    
    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=fichaje.empresa_id,
        accion=AccionAuditoriaEnum.ELIMINACION,
        detalle={"recurso": "fichajes", "accion": "intento_eliminacion_fichaje", "entidad_id": str(id_fichaje), "detalles": f"Intento de eliminación directa del fichaje inmutable {id_fichaje}"}
    )
    db.commit()

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Los fichajes son inmutables. Solicita una corrección o anulación mediante el flujo de incidencias.",
    )