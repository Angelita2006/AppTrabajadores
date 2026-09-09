from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.calendarios_laborales import CalendariosLaborales
from models.usuarios import Usuarios
from models.festivos import Festivos
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.calendarios_laborales import CalendariosLaborales
from models.usuarios import Usuarios
from models.festivos import Festivos
from schemas.calendarios_festivos import FestivoCreate, FestivoUpdate, FestivoResponse

router = APIRouter(prefix="/api/festivos", tags=["Festivos"])

limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=FestivoResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("15/minute")
def crear_festivo(
    request: Request,
    obj_in: FestivoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **POST /api/festivos**
    Registra un nuevo día festivo (nacional, autonómico o local) dentro de un calendario laboral.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de festivo desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    calendario = db.query(CalendariosLaborales).options(
        joinedload(CalendariosLaborales.empresa)
    ).filter(CalendariosLaborales.id == obj_in.calendario_id).first()
    
    if not calendario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendario laboral ({obj_in.calendario_id}) no encontrado."
        )

    if usuario_actual.empresa_id != calendario.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear festivos en este calendario."
        )

    festivo_existente = db.query(Festivos).options(
        joinedload(Festivos.calendario).joinedload(CalendariosLaborales.empresa)
    ).filter(
        Festivos.calendario_id == obj_in.calendario_id,
        Festivos.fecha == obj_in.fecha
    ).first()
    
    if festivo_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un día festivo registrado para esa misma fecha en este calendario."
        )

    nuevo_festivo = Festivos(
        calendario_id=obj_in.calendario_id,
        fecha=obj_in.fecha,
        tipo=obj_in.tipo,
        descripcion=obj_in.descripcion
    )
    
    try:
        db.add(nuevo_festivo)
        db.commit()
        
        festivo_creado = db.query(Festivos).options(
            joinedload(Festivos.calendario).joinedload(CalendariosLaborales.empresa)
        ).filter(Festivos.id == nuevo_festivo.id).first()
        
        return festivo_creado
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error de integridad al guardar el día festivo: {str(error)}"
        )


@router.put("/{id_festivo}/editar", response_model=FestivoResponse)
@limiter.limit("30/minute")
def editar_festivo(
    request: Request,
    id_festivo: UUID, 
    obj_in: FestivoUpdate,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **PUT /api/festivos/{id_festivo}/editar**
    Modifica la fecha, el tipo o la descripción del festivo.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de edición del festivo {id_festivo} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    festivo = db.query(Festivos).options(
        joinedload(Festivos.calendario).joinedload(CalendariosLaborales.empresa)
    ).filter(Festivos.id == id_festivo).first()
    
    if not festivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ningún festivo con el ID {id_festivo}."
        )
    
    calendario = db.query(CalendariosLaborales).options(
        joinedload(CalendariosLaborales.empresa)
    ).filter(CalendariosLaborales.id == festivo.calendario_id).first()
    
    if calendario and usuario_actual.empresa_id != calendario.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para editar este festivo."
        )

    if obj_in.calendario_id is not None and obj_in.calendario_id != festivo.calendario_id:
        nuevo_calendario = db.query(CalendariosLaborales).options(
            joinedload(CalendariosLaborales.empresa)
        ).filter(CalendariosLaborales.id == obj_in.calendario_id).first()
        
        if not nuevo_calendario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Calendario laboral de destino ({obj_in.calendario_id}) no encontrado."
            )
        if usuario_actual.empresa_id != nuevo_calendario.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para mover este festivo a un calendario de otra empresa."
            )
        setattr(festivo, "calendario_id", obj_in.calendario_id)
    
    if obj_in.fecha is not None:
        setattr(festivo, "fecha", obj_in.fecha)
    if obj_in.tipo is not None:
        setattr(festivo, "tipo", obj_in.tipo)
    if obj_in.descripcion is not None:
        setattr(festivo, "descripcion", obj_in.descripcion)
        
    if hasattr(Festivos, "updated_at"):
        setattr(festivo, "updated_at", datetime.now())
    
    try:
        db.commit()
        
        festivo_actualizado = db.query(Festivos).options(
            joinedload(Festivos.calendario).joinedload(CalendariosLaborales.empresa)
        ).filter(Festivos.id == id_festivo).first()
        
        return festivo_actualizado
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el día festivo: {str(error)}"
        )


@router.delete("/{id_festivo}", status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
def eliminar_festivo_manual(
    request: Request,
    id_festivo: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **DELETE /api/festivos/{id_festivo}**
    Elimina físicamente un día festivo concreto del cuadrante mediante su ID único UUID.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de eliminación del festivo {id_festivo} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    festivo = db.query(Festivos).options(
        joinedload(Festivos.calendario).joinedload(CalendariosLaborales.empresa)
    ).filter(Festivos.id == id_festivo).first()
    
    if not festivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Día festivo con ID {id_festivo} no encontrado."
        )
    
    if festivo.calendario and usuario_actual.empresa_id != festivo.calendario.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar este festivo."
        )
    
    try:
        db.delete(festivo)
        db.commit()
        return {"detail": f"Día festivo ({id_festivo}) eliminado correctamente del calendario."}
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al eliminar el día festivo: {str(error)}"
        )


@router.get("/calendario/{id_calendario}", response_model=List[FestivoResponse])
@limiter.limit("60/minute")
def obtener_festivos_por_calendario(
    request: Request,
    id_calendario: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/festivos/calendario/{id_calendario}**
    Recupera de forma ordenada el catálogo de días no laborables asignados a un calendario específico.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de festivos para el calendario {id_calendario} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    calendario = db.query(CalendariosLaborales).options(
        joinedload(CalendariosLaborales.empresa)
    ).filter(CalendariosLaborales.id == id_calendario).first()
    
    if not calendario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendario laboral ({id_calendario}) no encontrado."
        )

    if usuario_actual.empresa_id != calendario.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los festivos de este calendario."
        )

    return (
        db.query(Festivos)
        .options(
            joinedload(Festivos.calendario).joinedload(CalendariosLaborales.empresa)
        )
        .filter(Festivos.calendario_id == id_calendario)
        .order_by(Festivos.fecha.asc())
        .all()
    )