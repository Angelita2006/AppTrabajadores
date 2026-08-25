from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from schemas.asignaciones_turno import AsignacionTurnoCreate, AsignacionTurnoMasivaCreate, AsignacionTurnoResponse
from models.trabajadores import Trabajadores
from models.turnos import Turnos
from models.asignaciones_turno import AsignacionesTurno
from models.usuarios import Usuarios

router = APIRouter(prefix="/api/asignaciones-turno", tags=["Asignaciones de Turno"])

limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=AsignacionTurnoResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def asignar_turno_trabajador(
    request: Request,
    obj_in: AsignacionTurnoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: POST /api/asignaciones-turno
    Vincula a un trabajador con un turno teórico fijando su fecha de inicio de vigencia.
    """
    # 1. Validaciones estructurales básicas de existencia
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    turno = db.query(Turnos).filter(Turnos.id == obj_in.turno_id).first()
    if not turno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turno teórico no encontrado.")

    # 2. Mapeo y volcado directo al modelo físico de la base de datos
    nueva_asignacion = AsignacionesTurno(
        trabajador_id=obj_in.trabajador_id,
        turno_id=obj_in.turno_id,
        fecha_inicio=obj_in.fecha_inicio,
        fecha_fin=obj_in.fecha_fin
    )

    try:
        db.add(nueva_asignacion)
        db.commit()
        db.refresh(nueva_asignacion)
        return nueva_asignacion
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al consolidar la asignación en la base de datos: {str(error)}"
        )

@router.post("/masiva", response_model=List[AsignacionTurnoResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def asignar_turnos_masivamente(
    request: Request,
    obj_in: AsignacionTurnoMasivaCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: POST /api/asignaciones-turno/masiva
    Vincula a un trabajador con múltiples turnos de forma atómica.
    """
    # 1. Validar existencia del trabajador
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    nuevas_asignaciones = []
    
    try:
        for turno_id in obj_in.turnos_ids:
            # Validar que cada turno exista
            turno = db.query(Turnos).filter(Turnos.id == turno_id).first()
            if not turno:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Turno {turno_id} no encontrado.")
            
            nueva_asignacion = AsignacionesTurno(
                trabajador_id=obj_in.trabajador_id,
                turno_id=turno_id,
                fecha_inicio=obj_in.fecha_inicio,
                fecha_fin=obj_in.fecha_fin
            )
            nuevas_asignaciones.append(nueva_asignacion)
            db.add(nueva_asignacion)

        db.commit()
        for asignacion in nuevas_asignaciones:
            db.refresh(asignacion)
            
        return nuevas_asignaciones
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar la asignación masiva: {str(error)}"
        )

@router.put("/{id_asignacion}/editar", response_model=AsignacionTurnoResponse)
@limiter.limit("20/minute")
def editar_asignacion_turno(
    request: Request,
    id_asignacion: UUID, 
    fecha_fin: date, 
    fecha_inicio = None,  
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: PUT /api/asignaciones-turno/{id_asignacion}/editar?fecha_fin=AAAA-MM-DD
    Edita los datos sobre un turno asignado para permitir rotaciones horarias.
    """
    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación de turno no encontrada.")

    # Emulación en la capa de la API de la regla lógica CheckConstraint de la base de datos
    if asignacion.fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de finalización no puede ser previa a la fecha de inicio del turno."
        )

    if fecha_inicio is not None:   
        setattr(asignacion, "fecha_inicio", fecha_inicio)
        
    setattr(asignacion, "fecha_fin", fecha_fin)
    
    db.commit()
    db.refresh(asignacion)
    return asignacion


@router.patch("/{id_asignacion}/created-at", response_model=AsignacionTurnoResponse, status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")
def poner_fecha_creacion_asignacion_turno(
    request: Request,
    id_asignacion: UUID, 
    fecha_creacion: datetime, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: PATCH /api/asignaciones-turno/{id_asignacion}/created-at
    Da a la asignación de turno un fecha de creación.
    """
    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró la asignación de turno con ID {id_asignacion}."
        )

    asignacion.created_at = fecha_creacion

    try:
        db.commit()
        db.refresh(asignacion)
        return asignacion
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar la fecha de creación: {str(e)}"
        )


@router.put("/{id_asignacion}/finalizar", response_model=AsignacionTurnoResponse)
@limiter.limit("20/minute")
def finalizar_vigencia_turno(
    request: Request,
    id_asignacion: UUID, 
    fecha_fin: date, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: PUT /api/asignaciones-turno/{id_asignacion}/finalizar?fecha_fin=AAAA-MM-DD
    Establece la fecha de corte o vencimiento de un turno asignado para permitir rotaciones horarias.
    """
    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación de turno no encontrada.")

    if asignacion.fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de finalización no puede ser previa a la fecha de inicio del turno."
        )

    setattr(asignacion, "fecha_fin", fecha_fin)
    
    db.commit()
    db.refresh(asignacion)
    return asignacion


@router.delete("/{id_asignacion}", status_code=status.HTTP_200_OK)
def eliminar_asignacion_turno(
    id_asignacion: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: DELETE /api/asignaciones-turno/{id_asignacion}
    Elimina físicamente una asignación del plan.
    """
    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación de turno no encontrada.")

    db.delete(asignacion)
    db.commit()
    return {"detail": f"Asignación ({id_asignacion}) eliminada correctamente del cuadrante."}


@router.delete("/trabajador/{trabajador_id}/eliminar-todas", status_code=status.HTTP_200_OK)
def eliminar_todas_asignaciones_trabajador(
    trabajador_id: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: DELETE /api/asignaciones-turno/trabajador/{trabajador_id}/eliminar-todas
    Elimina todas las asignaciones de turno vinculadas a un trabajador específico.
    """
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    try:
        asignaciones = db.query(AsignacionesTurno).filter(AsignacionesTurno.trabajador_id == trabajador_id).all()
        
        if not asignaciones:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="No se encontraron asignaciones para este trabajador."
            )

        for asignacion in asignaciones:
            db.delete(asignacion)
            
        db.commit()
        return {"detail": f"Se han eliminado {len(asignaciones)} asignaciones del trabajador."}
    
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar las asignaciones: {str(error)}"
        )

@router.get("/trabajador/{id_trabajador}", response_model=List[AsignacionTurnoResponse])
def obtener_asignaciones_por_trabajador(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/asignaciones-turno/trabajador/{id_trabajador}
    Recupera el cuadrante histórico y actual de turnos planificados para un operario específico.
    """
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    return db.query(AsignacionesTurno).filter(AsignacionesTurno.trabajador_id == id_trabajador).all()
