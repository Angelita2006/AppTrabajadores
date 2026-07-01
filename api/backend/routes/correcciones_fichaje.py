import hashlib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from uuid import UUID
from routes.fichajes import calcular_hash_fichaje, mapear_evento_a_id
from core.database import get_db
from models.empresas import Empresas
from models.enums import EstadoCorreccionEnum, EstadoFichajeEnum, MetodoFichajeEnum, OrigenFichajeEnum, TipoCorreccionEnum
from schemas.correcciones_fichaje import CorreccionFichajeCreate, CorreccionFichajeResponse
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from models.fichajes import Fichajes
from models.correcciones_fichaje import CorreccionesFichaje

router = APIRouter(prefix="/api/correcciones", tags=["Correcciones de Fichaje"])

@router.post("", response_model=CorreccionFichajeResponse, status_code=status.HTTP_201_CREATED)
def solicitar_correccion(obj_in: CorreccionFichajeCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/correcciones
    Crea una nueva solicitud de rectificación horaria en estado 'pendiente' por defecto.
    """
    # 1. Validaciones estructurales básicas de existencia
    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada.")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    usuario = db.query(Usuarios).filter(Usuarios.id == obj_in.solicitado_por_usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario solicitante no encontrado.")

    if obj_in.fichaje_afectado_id:
        fichaje = db.query(Fichajes).filter(Fichajes.id == obj_in.fichaje_afectado_id).first()
        if not fichaje:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichaje afectado no encontrado.")

    # 2. Volcado directo al modelo relacional de SQLAlchemy
    nueva_correccion = CorreccionesFichaje(
        empresa_id=obj_in.empresa_id,
        trabajador_id=obj_in.trabajador_id,
        tipo_correccion=obj_in.tipo_correccion,
        valor_nuevo=obj_in.valor_nuevo,
        motivo=obj_in.motivo,
        solicitado_por_usuario_id=obj_in.solicitado_por_usuario_id,
        fichaje_afectado_id=obj_in.fichaje_afectado_id,
        valor_anterior=obj_in.valor_anterior,
        estado=EstadoCorreccionEnum.PENDIENTE # Forzado por seguridad en la API
    )

    db.add(nueva_correccion)
    db.commit()
    db.refresh(nueva_correccion)
    return nueva_correccion


@router.get("", response_model=List[CorreccionFichajeResponse])
def obtener_todas_las_correcciones(db: Session = Depends(get_db)):
    """
    URI: GET /api/correcciones
    Lista el histórico completo de solicitudes guardadas en el Saas para auditorías globales.
    """
    return db.query(CorreccionesFichaje).all()


@router.get("/empresa/{id_empresa}", response_model=List[CorreccionFichajeResponse])
def obtener_correcciones_por_empresa(id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/correcciones/empresa/{id_empresa}
    Filtra las peticiones dentro de un mismo tenant (útil para el panel de RRHH de la empresa).
    """
    return db.query(CorreccionesFichaje).filter(CorreccionesFichaje.empresa_id == id_empresa).all()


@router.get("/trabajador/{id_trabajador}", response_model=List[CorreccionFichajeResponse])
def obtener_correcciones_por_trabajador(id_trabajador: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/correcciones/trabajador/{id_trabajador}
    Permite al empleado seguir el estado de sus peticiones enviadas desde la app móvil.
    """
    return db.query(CorreccionesFichaje).filter(CorreccionesFichaje.trabajador_id == id_trabajador).all()
@router.put("/{id_correccion}/resolver")
def resolver_incidencia(
    id_correccion: UUID, 
    nuevo_estado: EstadoCorreccionEnum, 
    resolutor_usuario_id: UUID, 
    db: Session = Depends(get_db)
):
    # 1. Buscar la solicitud de corrección
    incidencia = db.query(CorreccionesFichaje).filter(CorreccionesFichaje.id == id_correccion).first()
    if not incidencia:
        raise HTTPException(status_code=404, detail="Solicitud de corrección no encontrada.")
    
    if incidencia.estado != EstadoCorreccionEnum.PENDIENTE:
        raise HTTPException(status_code=400, detail="Esta incidencia ya fue resuelta previamente.")

    try:
        # Actualizar el estado de la solicitud
        incidencia.estado = nuevo_estado
        incidencia.resolutor_usuario_id = resolutor_usuario_id
        incidencia.fecha_resolucion = datetime.now()

        # 2. Si el Administrador aprueba, ejecutamos la lógica append-only
        if nuevo_estado == EstadoCorreccionEnum.APROBADA:
            fichaje_original = db.query(Fichajes).filter(Fichajes.id == incidencia.fichaje_afectado_id).first()
            
            # --- FASE 1: DESACTIVACIÓN (Para Anulaciones y Modificaciones) ---
            # Cambia el estado del anterior y actualiza su hash debido a la mutación de datos
            if incidencia.tipo_correccion in [TipoCorreccionEnum.ANULACION, TipoCorreccionEnum.MODIFICACION]:
                if fichaje_original:
                    fichaje_original.estado = EstadoFichajeEnum.PENDIENTE_REVISION
                    fichaje_original.hash_integridad = calcular_hash_fichaje(
                        trabajador_id=str(fichaje_original.trabajador_id),
                        empresa_id=str(fichaje_original.empresa_id),
                        tipo_evento_id=fichaje_original.tipo_evento_id,
                        fecha_iso=fichaje_original.fecha_hora.isoformat()
                    )
            
            # --- FASE 2: CREACIÓN DEL SUSTITUTO (Para Modificaciones y Altas Manuales) ---
            # Bloque independiente: una MODIFICACION pasará por la Fase 1 y también entrará aquí
            if incidencia.tipo_correccion in [TipoCorreccionEnum.MODIFICACION, TipoCorreccionEnum.ALTA_MANUAL]:
                v_nuevo = incidencia.valor_nuevo or {}
                fecha_str = v_nuevo.get("fecha_descuadre")   # Ej: "2026-06-29"
                hora_str = v_nuevo.get("hora_propuesta")     # Ej: "10:00"
                evento_str = v_nuevo.get("evento_solicitado") # Ej: "ENTRADA"

                if not fecha_str or not hora_str:
                    raise HTTPException(status_code=400, detail="Datos de tiempo insuficientes en la solicitud.")

                # Construir string ISO con el offset indicado en tus fichajes (+02:00)
                # Esto asegura que .isoformat() devuelva exactamente el string esperado por tu validador
                fecha_hora_propuesta = datetime.fromisoformat(f"{fecha_str}T{hora_str}:00+02:00")

                # 1. Aseguramos que id_real_evento sea un int válido
                if isinstance(evento_str, str):
                    id_real_evento = mapear_evento_a_id(evento_str)
                else:
                    # Si viene como int, lo usamos; si viene None o inválido, usamos 1 (ENTRADA) por defecto
                    id_real_evento = int(evento_str) if evento_str is not None else 1

                # Pylance ahora sabrá con certeza que es un 'int'
                sha256_calculado = calcular_hash_fichaje(
                    trabajador_id=str(incidencia.trabajador_id),
                    empresa_id=str(incidencia.empresa_id),
                    tipo_evento_id=id_real_evento,
                    fecha_iso=fecha_hora_propuesta.isoformat())

                nuevo_fichaje = Fichajes(
                    empresa_id=incidencia.empresa_id,
                    trabajador_id=incidencia.trabajador_id,
                    centro_trabajo_id=fichaje_original.centro_trabajo_id if fichaje_original else None,
                    tipo_evento_id=id_real_evento,
                    fecha_hora=fecha_hora_propuesta,
                    fecha_hora_dispositivo=fecha_hora_propuesta,
                    metodo_fichaje=MetodoFichajeEnum.WEB,  
                    origen=OrigenFichajeEnum.CORRECCION_RRHH,
                    estado=EstadoFichajeEnum.VALIDO,
                    hash_integridad=sha256_calculado,
                    fichaje_sustituido_id=incidencia.fichaje_afectado_id, # Enlace de auditoría al original
                    observaciones=f"Fichaje corrector mediante incidencia: {incidencia.motivo}"
                )
                db.add(nuevo_fichaje)

        db.commit()
        return {"detail": "Incidencia procesada con éxito."}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al resolver la corrección de fichajes: {str(e)}"
        )

@router.delete("/{id_correccion}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_solicitud_correccion(id_correccion: UUID, db: Session = Depends(get_db)):
    """
    URI: DELETE /api/correcciones/{id_correccion}
    Elimina físicamente un registro de solicitud de corrección por su ID.
    Retorna un estado 204 No Content si la operación es exitosa.
    """
    solicitud = db.query(CorreccionesFichaje).filter(CorreccionesFichaje.id == id_correccion).first()
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Solicitud de corrección no encontrada."
        )

    db.delete(solicitud)
    db.commit()
    return

@router.put("/correcciones/{id_correccion}/restaurar-pendiente")
def restaurar_correccion_pendiente(id_correccion: UUID, db: Session = Depends(get_db)):
    # Buscar la solicitud de corrección
    incidencia = db.query(CorreccionesFichaje).filter(CorreccionesFichaje.id == id_correccion).first()
    if not incidencia:
        raise HTTPException(status_code=404, detail="Solicitud de corrección no encontrada.")
    
    try:
        # Paso A: Si tenía un fichaje original afectado, lo devolvemos a estado 'valido'
        if incidencia.fichaje_afectado_id:
            db.query(Fichajes).filter(Fichajes.id == incidencia.fichaje_afectado_id).update(
                {Fichajes.estado: EstadoFichajeEnum.VALIDO}
            )
        
        # Paso B: Resetear la solicitud de corrección a su estado inicial
        incidencia.estado = EstadoCorreccionEnum.PENDIENTE
        incidencia.resolutor_usuario_id = None
        incidencia.fecha_resolucion = None
        
        db.commit()
        db.refresh(incidencia)
        return {"message": "Incidencia y fichaje original restaurados con éxito", "incidencia": incidencia}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al restaurar la incidencia: {str(e)}"
        )