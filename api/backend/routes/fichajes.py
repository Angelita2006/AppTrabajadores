import base64
from datetime import date, datetime, timedelta
import hashlib
import ipaddress
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.asignaciones_turno import AsignacionesTurno
from models.centros_trabajo import CentrosTrabajo
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import EstadoFichajeEnum, MetodoFichajeEnum, OrigenFichajeEnum, TipoUsuarioEnum
from core.utils import calcular_distancia_metros, calcular_hash_fichaje, validar_dia_laboral_o_marcar_extra
from models.empresas import Empresas
from models.fichajes import Fichajes
from models.usuarios import Usuarios
from schemas.fichajes import FichajeCreate, FichajeResponse
from models.tipos_evento_fichaje import TiposEventoFichaje
from models.trabajadores import Trabajadores
from models.turnos import Turnos

# APIRouter agrupa todos los endpoints relacionados con la gestión de fichajes bajo el prefijo "/api/fichajes".
router = APIRouter(prefix="/api/fichajes", tags=["Fichajes"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
# Esto previene ataques de fuerza bruta o saturación de peticiones en rutas críticas.
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=FichajeResponse, status_code=status.HTTP_201_CREATED, summary="Registrar fichaje")
@limiter.limit("30/minute") # Limita la frecuencia de registros masivos para proteger la integridad y base de datos
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
    # Registrar la dirección IP del cliente y trazas de auditoría de acceso
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de fichaje desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).options(
        joinedload(Trabajadores.empresa)
    ).filter(Trabajadores.id == obj_in.trabajador_id).first()
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
    ).filter(CentrosTrabajo.id == obj_in.centro_trabajo_id).first()
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

    tipo_evento_obj = db.query(TiposEventoFichaje).filter(TiposEventoFichaje.id == obj_in.tipo_evento_id).first()
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
            data_encoded = data_firma.split(",", 1)[1] if "," in data_firma else data_firma
            bytes_imagen = base64.b64decode(data_encoded)

            nombre_archivo = f"firma_{uuid.uuid4().hex}.png"
            ruta_destino = os.path.join("static/firmas", nombre_archivo)

            with open(ruta_destino, "wb") as buffer:
                buffer.write(bytes_imagen)

            ruta_relativa_firma = f"/static/firmas/{nombre_archivo}"
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
            detail=f"Error interno al guardar el fichaje en la base de datos: {str(e)}"
        )


@router.get("/trabajador/{id_trabajador}/empresa/{id_empresa}", response_model=List[FichajeResponse], summary="Obtener fichajes de trabajador por empresa")
@limiter.limit("60/minute") # Limita las consultas masivas de listados para proteger el rendimiento
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

    return db.query(Fichajes).options(
        joinedload(Fichajes.tipo_evento),
        joinedload(Fichajes.trabajador),
        joinedload(Fichajes.centro_trabajo)
    ).filter(
        Fichajes.trabajador_id == id_trabajador,
        Fichajes.empresa_id == id_empresa
    ).all()


@router.get("/trabajador/{id_trabajador}/hoy", response_model=List[FichajeResponse], summary="Obtener fichajes de hoy")
@limiter.limit("60/minute") # Limita las consultas de fichajes diarios por IP
def obtener_fichajes_hoy(
    request: Request,
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/fichajes/trabajador/{id_trabajador}/hoy**
     
    Retorna la lista de fichajes realizados por el trabajador en el día actual (fecha de hoy).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de fichajes de hoy para el trabajador {id_trabajador} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID ({id_trabajador}) no localizado."
        )

    hoy = date.today()
    fichajes_db = db.query(Fichajes).options(
        joinedload(Fichajes.tipo_evento),
        joinedload(Fichajes.trabajador),
        joinedload(Fichajes.centro_trabajo)
    ).filter(
        Fichajes.trabajador_id == id_trabajador
    ).all()
    
    fichajes_filtrados = [f for f in fichajes_db if f.fecha_hora.date() == hoy]
    
    return fichajes_filtrados


@router.get("/trabajador/{id_trabajador}/semana", response_model=List[FichajeResponse], summary="Obtener fichajes de la semana actual")
@limiter.limit("60/minute") # Limita las consultas de fichajes semanales
def obtener_fichajes_semana_actual(
    request: Request,
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/fichajes/trabajador/{id_trabajador}/semana**
     
    Obtiene todos los fichajes registrados de un trabajador durante la semana en curso (de lunes a domingo).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de fichajes semanales para el trabajador {id_trabajador} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trabajador no localizado en el sistema."
        )

    hoy = date.today()
    dia_semana = hoy.weekday()
    lunes_esta_semana = hoy - timedelta(days=dia_semana)
    domingo_esta_semana = lunes_esta_semana + timedelta(days=6)

    fichajes_semana = (
        db.query(Fichajes)
        .options(
            joinedload(Fichajes.tipo_evento),
            joinedload(Fichajes.trabajador),
            joinedload(Fichajes.centro_trabajo)
        )
        .filter(
            Fichajes.trabajador_id == id_trabajador,
            func.date(Fichajes.fecha_hora_dispositivo) >= lunes_esta_semana,
            func.date(Fichajes.fecha_hora_dispositivo) <= domingo_esta_semana
        )
        .order_by(Fichajes.fecha_hora_dispositivo.asc())
        .all()
    )

    return fichajes_semana


@router.get("/trabajador/{id_trabajador}/turno", response_model=List[FichajeResponse], summary="Obtener fichajes del turno actual")
@limiter.limit("60/minute") # Limita las peticiones de fichajes por turno
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

    turno = db.query(Turnos).filter(Turnos.empresa_id == trabajador.empresa_id).first()
    if not turno:
        return []
    
    asignacion_turno = (
        db.query(AsignacionesTurno)
        .filter(AsignacionesTurno.trabajador_id == id_trabajador, AsignacionesTurno.turno_id == turno.id)
        .where(AsignacionesTurno.created_at <= datetime.now())
        .order_by(AsignacionesTurno.created_at.desc())
        .first()
    )
    if not asignacion_turno:
        return []
    
    fecha_inicio = asignacion_turno.fecha_inicio
    fecha_fin = asignacion_turno.fecha_fin

    fichajes_turno = (
        db.query(Fichajes)
        .options(
            joinedload(Fichajes.tipo_evento),
            joinedload(Fichajes.trabajador),
            joinedload(Fichajes.centro_trabajo)
        )
        .filter(
            Fichajes.trabajador_id == id_trabajador,
            func.date(Fichajes.fecha_hora_dispositivo) >= fecha_inicio,
            func.date(Fichajes.fecha_hora_dispositivo) <= fecha_fin
        )
        .order_by(Fichajes.fecha_hora_dispositivo.asc())
        .all()
    )

    return fichajes_turno


@router.get("/trabajador/{trabajador_id}/ultimo", summary="Obtener último fichaje del trabajador")
@limiter.limit("60/minute") # Limita las consultas rápidas de último estado de fichaje
def obtener_ultimo_fichaje_trabajador(
    request: Request,
    trabajador_id: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/fichajes/trabajador/{trabajador_id}/ultimo**
     
    Devuelve estrictamente el último evento de fichaje registrado por el trabajador (ordenado de forma descendente).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición del último fichaje para el trabajador {trabajador_id} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == trabajador_id).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID ({trabajador_id}) no encontrado."
        )

    ultimo_fichaje = db.query(Fichajes).options(
        joinedload(Fichajes.tipo_evento),
        joinedload(Fichajes.trabajador),
        joinedload(Fichajes.centro_trabajo)
    ).filter(
        Fichajes.trabajador_id == trabajador_id
    ).order_by(Fichajes.fecha_hora.desc()).first()
    
    if not ultimo_fichaje:
        return {
            "id": None,
            "fecha_hora": None,
            "tipo_evento": "SALIDA"  
        }
        
    return ultimo_fichaje


@router.get("/empresa/{empresa_id}", status_code=status.HTTP_200_OK, summary="Listar fichajes de empresa por fecha")
@limiter.limit("60/minute") # Limita la carga de auditoría masiva diaria por empresa
def listar_fichajes_empresa_por_fecha(
    request: Request,
    empresa_id: UUID, 
    fecha: date, 
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
                func.date(Fichajes.fecha_hora_dispositivo) == fecha
            )
            .all()
        )

        payload_respuesta = []
        for fichaje in resultados:
            nombre_completo = "Operario de Planta"
            if fichaje.trabajador:
                nombre_completo = f"{fichaje.trabajador.nombre} {fichaje.trabajador.apellidos}"

            codigo_evento = ""
            if fichaje.tipo_evento:
                codigo_evento = getattr(fichaje.tipo_evento, "codigo", "")

            if fichaje.fecha_hora_dispositivo:
                fecha_hora_str = fichaje.fecha_hora_dispositivo.strftime("%Y-%m-%d %H:%M:%S")
            else:
                fecha_hora_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            payload_respuesta.append({
                "id": str(fichaje.id),
                "trabajador_id": str(fichaje.trabajador_id),
                "trabajador_nombre": nombre_completo,
                "codigo_evento_resuelto": codigo_evento.upper() if codigo_evento else "",
                "fecha_hora": fecha_hora_str, 
                "tipo_evento_id": str(fichaje.tipo_evento_id),
                "metodo_fichaje": str(fichaje.metodo_fichaje.value) if hasattr(fichaje.metodo_fichaje, "value") else str(fichaje.metodo_fichaje),
                "observaciones": fichaje.observaciones,
                "estado": fichaje.estado.value if hasattr(fichaje.estado, "value") else str(fichaje.estado)
            })

        return payload_respuesta

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al auditar y obtener los fichajes de la empresa: {str(e)}"
        )


@router.get("/{id_fichaje}", response_model=FichajeResponse, summary="Obtener fichaje por ID")
@limiter.limit("60/minute") # Limita las consultas individuales de detalles de fichaje
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

    return fichaje


@router.patch("/{id_fichaje}/validar", response_model=FichajeResponse, status_code=status.HTTP_200_OK, summary="Validar fichaje")
@limiter.limit("30/minute") # Limita las acciones de modificación/validación administrativa masiva
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

    fichaje.estado = EstadoFichajeEnum.VALIDO
    
    fecha_iso = fichaje.fecha_hora.isoformat() if fichaje.fecha_hora else datetime.now().isoformat()
    fichaje.hash_integridad = calcular_hash_fichaje(
        str(fichaje.trabajador_id), 
        str(fichaje.empresa_id), 
        str(fichaje.tipo_evento_id), 
        fecha_iso
    )

    try:
        db.commit()
        
        fichaje_actualizado = db.query(Fichajes).options(
            joinedload(Fichajes.tipo_evento),
            joinedload(Fichajes.trabajador),
            joinedload(Fichajes.centro_trabajo)
        ).filter(Fichajes.id == id_fichaje).first()
        
        return fichaje_actualizado
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar la validación del fichaje: {str(e)}"
        )


@router.delete("/{id_fichaje}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar fichaje")
@limiter.limit("20/minute") # Protegido de manera estricta frente a eliminaciones masivas accidentales o maliciosas
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
    
    try:
        db.delete(fichaje)
        db.commit()
        return None 
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la eliminación del fichaje: {str(e)}"
        )