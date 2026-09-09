from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
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

# APIRouter agrupa todos los endpoints relacionados con las asignaciones de turno bajo el prefijo "/api/asignaciones-turno".
router = APIRouter(prefix="/api/asignaciones-turno", tags=["Asignaciones de Turno"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=AsignacionTurnoResponse, status_code=status.HTTP_201_CREATED, summary="Asignar turno a trabajador")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def asignar_turno_trabajador(
    request: Request,
    obj_in: AsignacionTurnoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **POST /api/asignaciones-turno**
    
    Vincula a un trabajador con un turno teórico fijando su fecha de inicio de vigencia.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de asignación de turno para el trabajador ID {obj_in.trabajador_id} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    # 1. Validaciones estructurales básicas de existencia
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        print(f"Trabajador con ID {obj_in.trabajador_id} no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    turno = db.query(Turnos).filter(Turnos.id == obj_in.turno_id).first()
    if not turno:
        print(f"Turno teórico con ID {obj_in.turno_id} no encontrado.")
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
        
        asignacion_creada = (
            db.query(AsignacionesTurno)
            .options(
                joinedload(AsignacionesTurno.trabajador),
                joinedload(AsignacionesTurno.turno)
            )
            .filter(AsignacionesTurno.id == nueva_asignacion.id)
            .first()
        )
        
        print(f"Asignación de turno creada con éxito con ID: {nueva_asignacion.id}")
        return asignacion_creada
    except Exception as error:
        db.rollback()
        print(f"Error al consolidar la asignación en la base de datos: {str(error)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al consolidar la asignación en la base de datos: {str(error)}"
        )

@router.post("/masiva", response_model=List[AsignacionTurnoResponse], status_code=status.HTTP_201_CREATED, summary="Asignación masiva de turnos")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def asignar_turnos_masivamente(
    request: Request,
    obj_in: AsignacionTurnoMasivaCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **POST /api/asignaciones-turno/masiva**
    
    Vincula a un trabajador con múltiples turnos de forma atómica.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de asignación masiva para el trabajador ID {obj_in.trabajador_id} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    # 1. Validar existencia del trabajador
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        print(f"Trabajador con ID {obj_in.trabajador_id} no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    nuevas_asignaciones_ids = []
    
    try:
        for turno_id in obj_in.turnos_ids:
            # Validar que cada turno exista
            turno = db.query(Turnos).filter(Turnos.id == turno_id).first()
            if not turno:
                print(f"Turno con ID {turno_id} no encontrado durante asignación masiva.")
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Turno {turno_id} no encontrado.")
            
            nueva_asignacion = AsignacionesTurno(
                trabajador_id=obj_in.trabajador_id,
                turno_id=turno_id,
                fecha_inicio=obj_in.fecha_inicio,
                fecha_fin=obj_in.fecha_fin
            )
            db.add(nueva_asignacion)
            db.flush()
            nuevas_asignaciones_ids.append(nueva_asignacion.id)

        db.commit()
        
        asignaciones_creadas = (
            db.query(AsignacionesTurno)
            .options(
                joinedload(AsignacionesTurno.trabajador),
                joinedload(AsignacionesTurno.turno)
            )
            .filter(AsignacionesTurno.id.in_(nuevas_asignaciones_ids))
            .all()
        )
            
        print(f"Asignación masiva completada con éxito. Total registros: {len(asignaciones_creadas)}")
        return asignaciones_creadas
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as error:
        db.rollback()
        print(f"Error al procesar la asignación masiva: {str(error)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar la asignación masiva: {str(error)}"
        )

@router.put("/{id_asignacion}/editar", response_model=AsignacionTurnoResponse, summary="Editar asignación de turno")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def editar_asignacion_turno(
    request: Request,
    id_asignacion: UUID, 
    fecha_fin: date, 
    fecha_inicio = None,  
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/asignaciones-turno/{id_asignacion}/editar?fecha_fin=AAAA-MM-DD**
    
    Edita los datos sobre un turno asignado para permitir rotaciones horarias.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de edición para la asignación {id_asignacion} desde la IP: {cliente_ip} por: {usuario_actual.email}")

    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        print(f"Asignación de turno con ID {id_asignacion} no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación de turno no encontrada.")

    # Emulación en la capa de la API de la regla lógica CheckConstraint de la base de datos
    if fecha_inicio is not None:
        if fecha_inicio > fecha_fin:
            print(f"Error de validación de fechas en asignación {id_asignacion}: inicio posterior a fin.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha de finalización no puede ser previa a la fecha de inicio del turno."
            )
        setattr(asignacion, "fecha_inicio", fecha_inicio)
    else:
        if asignacion.fecha_inicio > fecha_fin:
            print(f"Error de validación de fechas en asignación {id_asignacion}: inicio posterior a fin.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha de finalización no puede ser previa a la fecha de inicio del turno."
            )
        
    setattr(asignacion, "fecha_fin", fecha_fin)
    
    db.commit()
    
    asignacion_actualizada = (
        db.query(AsignacionesTurno)
        .options(
            joinedload(AsignacionesTurno.trabajador),
            joinedload(AsignacionesTurno.turno)
        )
        .filter(AsignacionesTurno.id == id_asignacion)
        .first()
    )
    
    print(f"Asignación {id_asignacion} editada exitosamente.")
    return asignacion_actualizada


@router.patch("/{id_asignacion}/created-at", response_model=AsignacionTurnoResponse, status_code=status.HTTP_200_OK, summary="Actualizar fecha de creación de asignación")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def poner_fecha_creacion_asignacion_turno(
    request: Request,
    id_asignacion: UUID, 
    fecha_creacion: datetime, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PATCH /api/asignaciones-turno/{id_asignacion}/created-at**
    
    Da a la asignación de turno un fecha de creación.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de actualización de created_at para asignación {id_asignacion} desde la IP: {cliente_ip} por: {usuario_actual.email}")

    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        print(f"No se encontró la asignación de turno con ID {id_asignacion}.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró la asignación de turno con ID {id_asignacion}."
        )

    asignacion.created_at = fecha_creacion

    try:
        db.commit()
        
        asignacion_actualizada = (
            db.query(AsignacionesTurno)
            .options(
                joinedload(AsignacionesTurno.trabajador),
                joinedload(AsignacionesTurno.turno)
            )
            .filter(AsignacionesTurno.id == id_asignacion)
            .first()
        )
        
        print(f"Fecha de creación actualizada con éxito para la asignación {id_asignacion}.")
        return asignacion_actualizada
    except Exception as e:
        db.rollback()
        print(f"Error al guardar la fecha de creación para asignación {id_asignacion}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar la fecha de creación: {str(e)}"
        )


@router.put("/{id_asignacion}/finalizar", response_model=AsignacionTurnoResponse, summary="Finalizar vigencia de turno")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def finalizar_vigencia_turno(
    request: Request,
    id_asignacion: UUID, 
    fecha_fin: date, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/asignaciones-turno/{id_asignacion}/finalizar?fecha_fin=AAAA-MM-DD**
    
    Establece la fecha de corte o vencimiento de un turno asignado para permitir rotaciones horarias.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de finalización de vigencia para asignación {id_asignacion} desde la IP: {cliente_ip} por: {usuario_actual.email}")

    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        print(f"Asignación de turno con ID {id_asignacion} no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación de turno no encontrada.")

    if asignacion.fecha_inicio > fecha_fin:
        print(f"Error: Fecha de fin anterior a la de inicio en asignación {id_asignacion}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de finalización no puede ser previa a la fecha de inicio del turno."
        )

    setattr(asignacion, "fecha_fin", fecha_fin)
    
    db.commit()
    
    asignacion_actualizada = (
        db.query(AsignacionesTurno)
        .options(
            joinedload(AsignacionesTurno.trabajador),
            joinedload(AsignacionesTurno.turno)
        )
        .filter(AsignacionesTurno.id == id_asignacion)
        .first()
    )
    
    print(f"Vigencia del turno {id_asignacion} finalizada correctamente.")
    return asignacion_actualizada


@router.delete("/{id_asignacion}", status_code=status.HTTP_200_OK, summary="Eliminar asignación de turno")
def eliminar_asignacion_turno(
    id_asignacion: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **DELETE /api/asignaciones-turno/{id_asignacion}**
    
    Elimina físicamente una asignación del plan.
    """
    print(f"Petición de eliminación para la asignación {id_asignacion} por el usuario: {usuario_actual.email}")

    asignacion = db.query(AsignacionesTurno).filter(AsignacionesTurno.id == id_asignacion).first()
    if not asignacion:
        print(f"Asignación con ID {id_asignacion} no encontrada para eliminar.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación de turno no encontrada.")

    db.delete(asignacion)
    db.commit()
    print(f"Asignación {id_asignacion} eliminada correctamente.")
    return {"detail": f"Asignación ({id_asignacion}) eliminada correctamente del cuadrante."}


@router.delete("/trabajador/{trabajador_id}/eliminar-todas", status_code=status.HTTP_200_OK, summary="Eliminar todas las asignaciones de un trabajador")
def eliminar_todas_asignaciones_trabajador(
    trabajador_id: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **DELETE /api/asignaciones-turno/trabajador/{trabajador_id}/eliminar-todas**
    
    Elimina todas las asignaciones de turno vinculadas a un trabajador específico.
    """
    print(f"Petición para eliminar todas las asignaciones del trabajador ID {trabajador_id} por: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == trabajador_id).first()
    if not trabajador:
        print(f"Trabajador con ID {trabajador_id} no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    try:
        asignaciones = db.query(AsignacionesTurno).filter(AsignacionesTurno.trabajador_id == trabajador_id).all()
        
        if not asignaciones:
            print(f"No se encontraron asignaciones activas para el trabajador ID {trabajador_id}.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="No se encontraron asignaciones para este trabajador."
            )

        for asignacion in asignaciones:
            db.delete(asignacion)
            
        db.commit()
        print(f"Se han eliminado {len(asignaciones)} asignaciones del trabajador ID {trabajador_id}.")
        return {"detail": f"Se han eliminado {len(asignaciones)} asignaciones del trabajador."}
    
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as error:
        db.rollback()
        print(f"Error al eliminar las asignaciones del trabajador {trabajador_id}: {str(error)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar las asignaciones: {str(error)}"
        )

@router.get("/trabajador/{id_trabajador}", response_model=List[AsignacionTurnoResponse], summary="Obtener asignaciones por trabajador")
def obtener_asignaciones_por_trabajador(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **GET /api/asignaciones-turno/trabajador/{id_trabajador}**
    
    Recupera el cuadrante histórico y actual de turnos planificados para un operario específico.
    """
    print(f"Consulta de asignaciones de turno para el trabajador ID {id_trabajador} solicitada por: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador con ID {id_trabajador} no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    return (
        db.query(AsignacionesTurno)
        .options(
            joinedload(AsignacionesTurno.trabajador),
            joinedload(AsignacionesTurno.turno)
        )
        .filter(AsignacionesTurno.trabajador_id == id_trabajador)
        .all()
    )