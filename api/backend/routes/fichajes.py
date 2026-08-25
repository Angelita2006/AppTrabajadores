import hashlib
import ipaddress
import math
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.festivos import Festivos
from models.centros_trabajo import CentrosTrabajo
from models.asignaciones_turno import AsignacionesTurno
from models.contratos import Contratos
from models.tipos_evento_fichaje import TiposEventoFichaje  
from core.enums import EstadoFichajeEnum, MetodoFichajeEnum, OrigenFichajeEnum, TipoUsuarioEnum
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from models.empresas import Empresas
from models.fichajes import Fichajes
from schemas.fichajes import FichajeCreate, FichajeResponse
from models.trabajadores import Trabajadores
from models.turnos import Turnos
from models.usuarios import Usuarios

router = APIRouter(prefix="/api/fichajes", tags=["Fichajes"])

limiter = Limiter(key_func=get_remote_address)

def calcular_distancia_metros(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcula la distancia en metros entre dos puntos geográficos 
    utilizando la fórmula de Haversine.
    """
    radio_tierra_m = 6371000  # Radio de la Tierra en metros

    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    
    a = (
        math.sin(d_lat / 2) ** 2 +
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
        math.sin(d_lon / 2) ** 2
    )
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return radio_tierra_m * c

def validar_dia_laboral_o_marcar_extra(db: Session, trabajador_id: uuid.UUID, fecha_fichaje: datetime):
    contrato = db.query(Contratos).filter(
        Contratos.trabajador_id == trabajador_id,
        Contratos.activo == True,
        Contratos.fecha_inicio <= fecha_fichaje,
        (Contratos.fecha_fin == None) | (Contratos.fecha_fin >= fecha_fichaje)
    ).first()

    if not contrato or not contrato.calendario_laboral_id:
        return "Válido"

    es_festivo = db.query(Festivos).filter(
        Festivos.calendario_id == contrato.calendario_laboral_id,
        Festivos.fecha == fecha_fichaje.date()
    ).first()

    if es_festivo:
        return f"Festivo: {es_festivo.descripcion}"
        
    return "Válido"

def calcular_hash_fichaje(trabajador_id: str, empresa_id: str, tipo_evento_id: str, fecha_iso: str) -> str:
    """Genera el hash inmutable SHA-256 para auditoría legal"""
    datos_crudos = f"{trabajador_id}-{empresa_id}-{tipo_evento_id}-{fecha_iso}"
    return hashlib.sha256(datos_crudos.encode('utf-8')).hexdigest()


@router.post("", response_model=FichajeResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def crear_fichaje(
    request: Request,
    obj_in: FichajeCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    # 1. Validar trabajador y empresa
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=404, detail=f"Trabajador ({obj_in.trabajador_id}) no encontrado.")
    
    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail=f"Empresa ({obj_in.empresa_id}) no encontrada.")

    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para registrar fichajes en esta empresa.")

    # 2. VALIDAR DÍA FESTIVO O NO LABORABLE
    fecha_a_validar = obj_in.fecha_hora_dispositivo if obj_in.fecha_hora_dispositivo else datetime.now()
    validacion_dia = validar_dia_laboral_o_marcar_extra(db, obj_in.trabajador_id, fecha_a_validar)

    forzar_extra_enviado = getattr(obj_in, "forzar_hora_extra", False)

    if validacion_dia.startswith("Festivo"):
        if not forzar_extra_enviado:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"No se puede fichar en un día festivo/no laborable ({validacion_dia}). ¿Desea fichar de todos modos como horas extra?"
            )

    # 3. OBTENER Y VALIDAR EL CENTRO DE TRABAJO Y SU UBICACIÓN
    centro_trabajo = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == obj_in.centro_trabajo_id).first()
    if not centro_trabajo:
        raise HTTPException(status_code=404, detail="El centro de trabajo especificado no existe.")

    if centro_trabajo.latitud is not None and centro_trabajo.longitud is not None:
        if obj_in.latitud is None or obj_in.longitud is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere la ubicación GPS del dispositivo para validar el fichaje en este centro."
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
                detail=f"Ubicación inválida para fichar. Estás a {round(distancia, 2)} metros del centro de trabajo (máximo permitido: 200m)."
            )

    # 4. VALIDAR TIPO DE EVENTO DESDE LA BASE DE DATOS FILTRANDO POR SU ID (UUID)
    tipo_evento_obj = db.query(TiposEventoFichaje).filter(TiposEventoFichaje.id == obj_in.tipo_evento_id).first()
    if not tipo_evento_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El tipo de evento de fichaje con ID ({obj_in.tipo_evento_id}) no existe en la base de datos."
        )

    # 5. Procesamiento de IP, Hash y resto de lógica inmutable...
    ip_a_procesar = getattr(obj_in, "ip_address", None)
    if not ip_a_procesar and request.client:
        ip_a_procesar = request.client.host

    ip_int = None
    if ip_a_procesar:
        try:
            ip_int = int(ipaddress.ip_address(str(ip_a_procesar)))
        except ValueError:
            pass

    id_real_evento = tipo_evento_obj.id

    datos_crudos = f"{obj_in.trabajador_id}-{obj_in.empresa_id}-{id_real_evento}-{fecha_a_validar.isoformat()}"
    sha256_calculado = hashlib.sha256(datos_crudos.encode('utf-8')).hexdigest()

    observaciones_finales = obj_in.observaciones
    if validacion_dia.startswith("Festivo") and getattr(obj_in, "forzar_hora_extra", False):
        prefijo_extra = f"[HORA EXTRA - {validacion_dia}]"
        observaciones_finales = f"{prefijo_extra} {obj_in.observaciones}" if obj_in.observaciones else prefijo_extra

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
        motivo_pausa_id=obj_in.motivo_pausa_id
    )
    
    try:
        db.add(nuevo_fichaje)
        db.commit() 
        db.refresh(nuevo_fichaje)
        return nuevo_fichaje
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo en la transacción inmutable de PostgreSQL: {str(e)}"
        )

@router.delete("/fichajes/{id_fichaje}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_fichaje(
    id_fichaje: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    fichaje = db.query(Fichajes).filter(Fichajes.id == id_fichaje).first()
    if not fichaje:
        raise HTTPException(status_code=404, detail="Fichaje no encontrado.")
    
    if usuario_actual.empresa_id != fichaje.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar este fichaje."
        )
    
    try:
        db.delete(fichaje)
        db.commit()
        return None 
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar el fichaje: {str(e)}"
        )

@router.patch("/{id_fichaje}/validar", response_model=FichajeResponse, status_code=status.HTTP_200_OK)
@limiter.limit("30/minute") 
def validar_fichaje(
    request: Request,
    id_fichaje: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    fichaje = db.query(Fichajes).filter(Fichajes.id == id_fichaje).first()
    if not fichaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el registro de fichaje con ID {id_fichaje}."
        )

    if usuario_actual.empresa_id != fichaje.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para validar este fichaje."
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
        db.refresh(fichaje)
        return fichaje
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar la validación del fichaje en la base de datos: {str(e)}"
        )

@router.get("/trabajador/{id_trabajador}/empresa/{id_empresa}", response_model=List[FichajeResponse])
def obtener_fichajes_trabajador_empresa(
    id_trabajador: UUID, 
    id_empresa: UUID, 
    db: Session = Depends(get_db),
):
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador ({id_trabajador}) no encontrado."
        )
    
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa ({id_empresa}) no encontrada."
        )

    return db.query(Fichajes).filter(
        Fichajes.trabajador_id == id_trabajador,
        Fichajes.empresa_id == id_empresa
    ).all()


@router.get("/{id_fichaje}", response_model=FichajeResponse)
def obtener_fichaje(
    id_fichaje: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    fichaje = db.query(Fichajes).filter(Fichajes.id == id_fichaje).first()
    if not fichaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fichaje ({id_fichaje}) no encontrado."
        )
    
    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != fichaje.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver este fichaje."
        )

    return fichaje


@router.get("/trabajador/{id_trabajador}/hoy")
def obtener_fichajes_hoy(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
):
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador ({id_trabajador}) no encontrado."
        )

    hoy = date.today()
    
    fichajes_db = db.query(Fichajes).filter(
        Fichajes.trabajador_id == id_trabajador
    ).all()
    
    fichajes_filtrados = [f for f in fichajes_db if f.fecha_hora.date() == hoy]
    
    respuesta = []
    for f in fichajes_filtrados:
        tipo_evento_db = db.query(TiposEventoFichaje).filter(TiposEventoFichaje.id == f.tipo_evento_id).first()
        nombre_tipo = tipo_evento_db.nombre if tipo_evento_db else "ENTRADA"

        respuesta.append({
          "id": str(f.id),
          "fecha_hora": f.fecha_hora.isoformat(),
          "tipo_evento": nombre_tipo
        })
        
    return respuesta


@router.get("/trabajador/{id_trabajador}/semana")
def obtener_fichajes_semana_actual(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
):
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trabajador no localizado."
        )

    hoy = date.today()
    dia_semana = hoy.weekday() 
    lunes_esta_semana = hoy - timedelta(days=dia_semana)
    domingo_esta_semana = lunes_esta_semana + timedelta(days=6)

    fichajes_semana = (
        db.query(Fichajes)
        .filter(
            Fichajes.trabajador_id == id_trabajador,
            func.date(Fichajes.fecha_hora_dispositivo) >= lunes_esta_semana,
            func.date(Fichajes.fecha_hora_dispositivo) <= domingo_esta_semana
        )
        .order_by(Fichajes.fecha_hora_dispositivo.asc())
        .all()
    )

    respuesta = []
    for f in fichajes_semana:
        tipo_evento_db = db.query(TiposEventoFichaje).filter(TiposEventoFichaje.id == f.tipo_evento_id).first()
        nombre_tipo = tipo_evento_db.nombre if tipo_evento_db else "ENTRADA"

        respuesta.append({
            "id": str(f.id),
            "fecha_hora": f.fecha_hora_dispositivo.isoformat() if f.fecha_hora_dispositivo else datetime.now().isoformat(),
            "tipo_evento": nombre_tipo, 
            "metodo_fichaje": str(f.metodo_fichaje.value) if hasattr(f.metodo_fichaje, "value") else str(f.metodo_fichaje),
            "estado": f.estado.value if hasattr(f.estado, "value") else str(f.estado),
        })

    return respuesta


@router.get("/trabajador/{id_trabajador}/turno")
def obtener_fichajes_turno_actual(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
):
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trabajador no localizado."
        )

    turno = db.query(Turnos).filter(Turnos.empresa_id == trabajador.empresa_id).first()
    if not turno:
        return ([])
    
    asignacion_turno = db.query(AsignacionesTurno).filter(AsignacionesTurno.trabajador_id == id_trabajador, AsignacionesTurno.turno_id == turno.id).where(AsignacionesTurno.created_at <= datetime.now()).order_by(AsignacionesTurno.created_at.desc()).first()
    if not asignacion_turno:
        return ([])
    
    fecha_inicio = asignacion_turno.fecha_inicio
    fecha_fin = asignacion_turno.fecha_fin

    fichajes_semana = (
        db.query(Fichajes)
        .filter(
            Fichajes.trabajador_id == id_trabajador,
            func.date(Fichajes.fecha_hora_dispositivo) >= fecha_inicio,
            func.date(Fichajes.fecha_hora_dispositivo) <= fecha_fin
        )
        .order_by(Fichajes.fecha_hora_dispositivo.asc())
        .all()
    )

    respuesta = []
    for f in fichajes_semana:
        tipo_evento_db = db.query(TiposEventoFichaje).filter(TiposEventoFichaje.id == f.tipo_evento_id).first()
        nombre_tipo = tipo_evento_db.nombre if tipo_evento_db else "ENTRADA"

        respuesta.append({
            "id": str(f.id),
            "fecha_hora": f.fecha_hora_dispositivo.isoformat() if f.fecha_hora_dispositivo else datetime.now().isoformat(),
            "tipo_evento": nombre_tipo, 
            "metodo_fichaje": str(f.metodo_fichaje.value) if hasattr(f.metodo_fichaje, "value") else str(f.metodo_fichaje),
            "estado": f.estado.value if hasattr(f.estado, "value") else str(f.estado),
        })

    return respuesta


@router.get("/trabajador/{trabajador_id}/ultimo")
def obtener_ultimo_fichaje_trabajador(
    trabajador_id: UUID, 
    db: Session = Depends(get_db),
):
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == trabajador_id).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador ({trabajador_id}) no encontrado."
        )

    ultimo_fichaje = db.query(Fichajes).filter(
        Fichajes.trabajador_id == trabajador_id
    ).order_by(Fichajes.fecha_hora.desc()).first()
    
    if not ultimo_fichaje:
        return {
            "id": None,
            "fecha_hora": None,
            "tipo_evento": "SALIDA"  
        }
        
    tipo_evento_db = db.query(TiposEventoFichaje).filter(TiposEventoFichaje.id == ultimo_fichaje.tipo_evento_id).first()
    nombre_tipo = tipo_evento_db.nombre if tipo_evento_db else "ENTRADA"

    return {
        "id": str(ultimo_fichaje.id),
        "fecha_hora": ultimo_fichaje.fecha_hora.isoformat(),
        "tipo_evento": nombre_tipo
    }


@router.get("/empresa/{empresa_id}", status_code=status.HTTP_200_OK)
def listar_fichajes_empresa_por_fecha(
    empresa_id: UUID, 
    fecha: date, 
    db: Session = Depends(get_db),
):
    try:
        resultados = (
            db.query(Fichajes)
            .filter(
                Fichajes.empresa_id == empresa_id,
                func.date(Fichajes.fecha_hora_dispositivo) == fecha
            )
            .all()
        )

        payload_respuesta = []
        for fichaje in resultados:
            nombre_completo = "Operario de Planta"
            if hasattr(fichaje, "trabajador") and fichaje.trabajador:
                nombre_completo = f"{fichaje.trabajador.nombre} {fichaje.trabajador.apellidos}"
            elif hasattr(fichaje, "usuario") and fichaje.usuario:
                nombre_completo = f"{fichaje.usuario.nombre}"

            nombre_turno = "Sin Turno Programado"
            if hasattr(fichaje, "turno") and fichaje.turno:
                nombre_turno = fichaje.turno.nombre

            if fichaje.fecha_hora_dispositivo:
                fecha_hora_str = fichaje.fecha_hora_dispositivo.strftime("%Y-%m-%d %H:%M:%S")
            else:
                fecha_hora_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            payload_respuesta.append({
                "id": str(fichaje.id),
                "trabajador_id": str(fichaje.trabajador_id),
                "trabajador_nombre": nombre_completo,
                "turno_nombre": nombre_turno,
                "fecha_hora": fecha_hora_str, 
                "tipo_evento": str(fichaje.tipo_evento_id),
                "metodo_fichaje": str(fichaje.metodo_fichaje.value) if hasattr(fichaje.metodo_fichaje, "value") else str(fichaje.metodo_fichaje),
                "observaciones": fichaje.observaciones,
                "estado": fichaje.estado.value if hasattr(fichaje.estado, "value") else str(fichaje.estado)
            })

        return payload_respuesta

    except Exception as e:
        db.rollback()
        print(f"[FICHAPP ERROR]: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la auditoría de fichajes en PostgreSQL: {str(e)}"
        )
