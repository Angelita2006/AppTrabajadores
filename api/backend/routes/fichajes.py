import hashlib
import ipaddress
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import and_, func
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from typing import List
from uuid import UUID

from slowapi import Limiter
from slowapi.util import get_remote_address

from models.asignaciones_turno import AsignacionesTurno
from models.contratos import Contratos
from models.enums import EstadoFichajeEnum, MetodoFichajeEnum, OrigenFichajeEnum
from core.database import get_db
from core.security import obtener_usuario_actual
from models.empresas import Empresas
from models.fichajes import Fichajes
from schemas.fichajes import FichajeCreate, FichajeResponse
from models.trabajadores import Trabajadores
from models.turnos import Turnos
from models.usuarios import Usuarios

router = APIRouter(prefix="/api/fichajes", tags=["Fichajes"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)


def mapear_evento_id(label_frontend: str) -> int:
    """
    Traduce los strings enviados por la app móvil ("ENTRADA", "SALIDA")
    a los enteros numéricos 'tipo_evento_id' que exige tu base de datos.
    Ajusta estos números (1, 2, 3, 4) según los IDs reales de tu tabla de eventos.
    """
    mapeo = {
        "ENTRADA": 1,
        "SALIDA": 2,
        "INICIO_PAUSA": 3,
        "FIN_PAUSA": 4
    }
    return mapeo.get(label_frontend, 1)

def mapear_id_evento(id_backend: int) -> str:
    """
    Traduce de vuelta los IDs numéricos de la base de datos a los strings
    que espera el cronómetro de la app móvil para calcular el tiempo.
    """
    mapeo = {
        1: "ENTRADA",
        2: "SALIDA",
        3: "INICIO_PAUSA",
        4: "FIN_PAUSA"
    }
    return mapeo.get(id_backend, "ENTRADA")


@router.post("", response_model=FichajeResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")  # Protegido frente a saturación de marcajes masivos desde dispositivos móviles
def crear_fichaje(
    request: Request,
    obj_in: FichajeCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/fichajes
    Registra un evento de jornada inmutable calculando el tiempo oficial en el servidor
    y generando el hash criptográfico SHA-256 requerido por la restricción Not-Null de PostgreSQL.
    """
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador ({obj_in.trabajador_id}) no encontrado."
        )
    
    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar fichajes en esta empresa."
        )

    ip_int = None
    if hasattr(obj_in, 'ip_address') and obj_in.ip_address:
        try:
            ip_int = int(ipaddress.ip_address(str(obj_in.ip_address)))
        except ValueError:
            pass

    id_real_evento = obj_in.tipo_evento_id
    if isinstance(id_real_evento, str):
        id_real_evento = mapear_evento_id(id_real_evento)

    ahora = datetime.now()

    datos_crudos = f"{obj_in.trabajador_id}-{obj_in.empresa_id}-{id_real_evento}-{ahora.isoformat()}"
    sha256_calculado = hashlib.sha256(datos_crudos.encode('utf-8')).hexdigest()

    nuevo_fichaje = Fichajes(
        empresa_id=obj_in.empresa_id,
        trabajador_id=obj_in.trabajador_id,
        centro_trabajo_id=obj_in.centro_trabajo_id,
        tipo_evento_id=id_real_evento,
        fecha_hora=ahora,
        metodo_fichaje=MetodoFichajeEnum(obj_in.metodo_fichaje) if isinstance(obj_in.metodo_fichaje, str) else obj_in.metodo_fichaje,
        origen=OrigenFichajeEnum(obj_in.origen) if hasattr(obj_in, 'origen') and obj_in.origen else OrigenFichajeEnum.TRABAJADOR,
        estado=EstadoFichajeEnum(obj_in.estado) if hasattr(obj_in, 'estado') and obj_in.estado else EstadoFichajeEnum.VALIDO,
        
        # Inyección explícita del hash calculado para satisfacer la columna física de la tabla
        hash_integridad=sha256_calculado,
        
        latitud=obj_in.latitud,
        longitud=obj_in.longitud,
        ip_address=ip_int,
        observaciones=obj_in.observaciones,
        fecha_hora_dispositivo=obj_in.fecha_hora_dispositivo or ahora,
        dispositivo_id=obj_in.dispositivo_id,
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


@router.get("", response_model=List[FichajeResponse])
def obtener_fichajes(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/fichajes
    Devuelve el historial global aplicando aislamiento multi-tenant.
    """
    query = db.query(Fichajes)
    
    if usuario_actual.tipo_usuario != "Administrador":
        if not usuario_actual.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No estás vinculado a ninguna empresa."
            )
        query = query.filter(Fichajes.empresa_id == usuario_actual.empresa_id)

    return query.all()


@router.get("/trabajador/{id_trabajador}/empresa/{id_empresa}", response_model=List[FichajeResponse])
def obtener_fichajes_trabajador_empresa(
    id_trabajador: UUID, 
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/fichajes/trabajador/{id_trabajador}/empresa/{id_empresa}
    Recupera el historial completo de marcajes para un usuario y organización particulares.
    """

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
    """
    URI: GET /api/fichajes/{id_fichaje}
    Busca un evento de fichaje específico mediante su identificador único UUID.
    """
    fichaje = db.query(Fichajes).filter(Fichajes.id == id_fichaje).first()
    if not fichaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fichaje ({id_fichaje}) no encontrado."
        )
    
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != fichaje.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver este fichaje."
        )

    return fichaje


@router.get("/trabajador/{id_trabajador}/hoy")
def obtener_fichajes_hoy(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/fichajes/trabajador/{id_trabajador}/hoy
    Descarga los marcajes del día de hoy del empleado y traduce los IDs relacionales 
    a las palabras clave ("ENTRADA", "SALIDA") que usa tu cronómetro acumulativo.
    """
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
        respuesta.append({
          "id": str(f.id),
          "fecha_hora": f.fecha_hora.isoformat(),
          "tipo_evento": mapear_id_evento(f.tipo_evento_id)
        })
        
    return respuesta


@router.get("/trabajador/{id_trabajador}/semana")
def obtener_fichajes_semana_actual(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/fichajes/trabajador/{id_trabajador}/semana
    Recupera el historial de la semana formateando las fechas a ISO string 
    y mapeando los IDs a strings de eventos legibles para el frontend.
    """
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
        respuesta.append({
            "id": str(f.id),
            "fecha_hora": f.fecha_hora_dispositivo.isoformat() if f.fecha_hora_dispositivo else datetime.now().isoformat(),
            "tipo_evento": mapear_id_evento(f.tipo_evento_id), 
            "metodo_fichaje": str(f.metodo_fichaje.value) if hasattr(f.metodo_fichaje, "value") else str(f.metodo_fichaje),
            "estado": f.estado.value if hasattr(f.estado, "value") else str(f.estado),
        })

    return respuesta


@router.get("/trabajador/{id_trabajador}/turno")
def obtener_fichajes_turno_actual(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/fichajes/trabajador/{id_trabajador}/turno
    Recupera el historial de fichajes dentro del turno formateando las fechas a ISO 
    string y mapeando los IDs a strings de eventos legibles para el frontend.
    """
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
        respuesta.append({
            "id": str(f.id),
            "fecha_hora": f.fecha_hora_dispositivo.isoformat() if f.fecha_hora_dispositivo else datetime.now().isoformat(),
            "tipo_evento": mapear_id_evento(f.tipo_evento_id), 
            "metodo_fichaje": str(f.metodo_fichaje.value) if hasattr(f.metodo_fichaje, "value") else str(f.metodo_fichaje),
            "estado": f.estado.value if hasattr(f.estado, "value") else str(f.estado),
        })

    return respuesta


@router.get("/trabajador/{trabajador_id}/ultimo")
def obtener_ultimo_fichaje_trabajador(
    trabajador_id: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/fichajes/trabajador/{trabajador_id}/ultimo
    Busca de forma eficiente el marcaje más reciente del empleado en PostgreSQL 
    para coordinar los botones de la interfaz de usuario.
    """
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
        
    return {
        "id": str(ultimo_fichaje.id),
        "fecha_hora": ultimo_fichaje.fecha_hora.isoformat(),
        "tipo_evento": mapear_id_evento(ultimo_fichaje.tipo_evento_id)
    }


@router.get("/empresa/{empresa_id}", status_code=status.HTTP_200_OK)
def listar_fichajes_empresa_por_fecha(
    empresa_id: UUID, 
    fecha: date, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/fichajes/empresa/{empresa_id}
    Devuelve los marcajes de la plantilla filtrados por fecha.
    """

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
                "tipo_evento": fichaje.tipo_evento_id,
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


@router.delete("/fichajes/{id_fichaje}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_fichaje(
    id_fichaje: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    fichaje = db.query(Fichajes).filter(Fichajes.id == id_fichaje).first()
    if not fichaje:
        raise HTTPException(status_code=404, detail="Fichaje no encontrado.")
    
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != fichaje.empresa_id:
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


def calcular_hash_fichaje(trabajador_id: str, empresa_id: str, tipo_evento_id: int, fecha_iso: str) -> str:
    """Genera el hash inmutable SHA-256 para auditoría legal"""
    datos_crudos = f"{trabajador_id}-{empresa_id}-{tipo_evento_id}-{fecha_iso}"
    return hashlib.sha256(datos_crudos.encode('utf-8')).hexdigest()


@router.patch("/{id_fichaje}/validar", response_model=FichajeResponse, status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")  # Protegido frente a peticiones masivas en la validación de registros de jornada
def validar_fichaje(
    request: Request,
    id_fichaje: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: PATCH /api/fichajes/{id_fichaje}/validar
    Modifica el estado de un marcaje a 'VALIDO' y recalcula de forma segura el hash criptográfico.
    """
    fichaje = db.query(Fichajes).filter(Fichajes.id == id_fichaje).first()
    if not fichaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el registro de fichaje con ID {id_fichaje}."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != fichaje.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para validar este fichaje."
        )

    fichaje.estado = EstadoFichajeEnum.VALIDO
    
    fecha_iso = fichaje.fecha_hora.isoformat() if fichaje.fecha_hora else datetime.now().isoformat()
    fichaje.hash_integridad = calcular_hash_fichaje(
        str(fichaje.trabajador_id), 
        str(fichaje.empresa_id), 
        fichaje.tipo_evento_id, 
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