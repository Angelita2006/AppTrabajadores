import hashlib
import ipaddress
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List
from uuid import UUID
from models.enums import EstadoFichajeEnum, MetodoFichajeEnum, OrigenFichajeEnum
from core.database import get_db
from models.empresas import Empresas
from models.fichajes import Fichajes
from schemas.fichajes import FichajeCreate, FichajeResponse
from models.trabajadores import Trabajadores

router = APIRouter(prefix="/api/fichajes", tags=["Fichajes"])

def mapear_evento_a_id(label_frontend: str) -> int:
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

def mapear_id_a_evento(id_backend: int) -> str:
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
def crear_fichaje(obj_in: FichajeCreate, db: Session = Depends(get_db)):
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

    ip_int = None
    if hasattr(obj_in, 'ip_address') and obj_in.ip_address:
        try:
            ip_int = int(ipaddress.ip_address(str(obj_in.ip_address)))
        except ValueError:
            pass

    id_real_evento = obj_in.tipo_evento_id
    if isinstance(id_real_evento, str):
        id_real_evento = mapear_evento_a_id(id_real_evento)

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
        db.commit() # La transacción se consolida sin lanzar violaciones de nulos
        db.refresh(nuevo_fichaje)
        return nuevo_fichaje
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo en la transacción inmutable de PostgreSQL: {str(e)}"
        )

@router.get("", response_model=List[FichajeResponse])
def obtener_fichajes(db: Session = Depends(get_db)):
    """
    URI: GET /api/fichajes
    Devuelve el historial global absoluto de todos los fichajes de la plataforma.
    """
    return db.query(Fichajes).all()


@router.get("/trabajador/{id_trabajador}/empresa/{id_empresa}", response_model=List[FichajeResponse])
def obtener_fichajes_trabajador_empresa(id_trabajador: UUID, id_empresa: UUID, db: Session = Depends(get_db)):
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
def obtener_fichaje(id_fichaje: UUID, db: Session = Depends(get_db)):
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
    return fichaje


# ====================================================================
# NUEVO ENDPOINT COMPATIBLE REQUERIDO POR TU CRONÓMETRO MÓVIL
# ====================================================================
@router.get("/trabajador/{id_trabajador}/hoy")
def obtener_fichajes_hoy(id_trabajador: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/fichajes/trabajador/{id_trabajador}/hoy
    Descarga los marcajes del día de hoy del empleado y traduce los IDs relacionales 
    a las palabras clave ("ENTRADA", "SALIDA") que usa tu cronómetro acumulativo.
    """
    hoy = date.today()
    
    # Consultamos los fichajes filtrando por el ID del trabajador y truncando la fecha a hoy
    fichajes_db = db.query(Fichajes).filter(
        Fichajes.trabajador_id == id_trabajador
    ).all()
    
    # Filtramos en Python por comodidad para asegurar la compatibilidad con campos de fecha estructurados
    fichajes_filtrados = [f for f in fichajes_db if f.fecha_hora.date() == hoy]
    
    # Formateamos la respuesta para que encaje perfectamente con lo que espera tu app/home.tsx
    respuesta = []
    for f in fichajes_filtrados:
        respuesta.append({
          "id": str(f.id),
          "fecha_hora": f.fecha_hora.isoformat(),
          "tipo_evento": mapear_id_a_evento(f.tipo_evento_id)
        })
        
    return respuesta

@router.get("/trabajador/{trabajador_id}/ultimo")
def obtener_ultimo_fichaje_trabajador(trabajador_id: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/fichajes/trabajador/{trabajador_id}/ultimo
    Busca de forma eficiente el marcaje más reciente del empleado en PostgreSQL 
    para coordinar los botones de la interfaz de usuario.
    """
    # Ordenamos de más reciente a más antiguo y tomamos el primero
    ultimo_fichaje = db.query(Fichajes).filter(
        Fichajes.trabajador_id == trabajador_id
    ).order_by(Fichajes.fecha_hora.desc()).first()
    
    # Si el empleado nunca ha fichado en el sistema, devolvemos un objeto plano neutro
    if not ultimo_fichaje:
        return {
            "id": None,
            "fecha_hora": None,
            "tipo_evento": "SALIDA"  
        }
        
    return {
        "id": str(ultimo_fichaje.id),
        "fecha_hora": ultimo_fichaje.fecha_hora.isoformat(),
        "tipo_evento": mapear_id_a_evento(ultimo_fichaje.tipo_evento_id)
    }