from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
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
from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum

# APIRouter agrupa todos los endpoints relacionados con la gestión de festivos bajo el prefijo "/api/festivos".
router = APIRouter(prefix="/api/festivos", tags=["Festivos"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
# Esto previene ataques de fuerza bruta o saturación de peticiones en rutas críticas.
limiter = Limiter(key_func=get_remote_address)

@router.post(
    "",
    response_model=FestivoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear día festivo",
    description="Registra un día festivo dentro de un calendario laboral.",
)
@limiter.limit("15/minute")
def crear_festivo(
    request: Request,
    obj_in: FestivoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
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
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=calendario.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "festivos", "accion": "crear", "entidad_id": str(nuevo_festivo.id), "detalles": f"Se creó el festivo {nuevo_festivo.id} para la fecha {nuevo_festivo.fecha}"}
        )

        return festivo_creado
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido guardar el día festivo: {str(error)}"
        )


@router.put(
    "/{id_festivo}/editar",
    response_model=FestivoResponse,
    summary="Editar día festivo",
    description="Actualiza la fecha, ámbito o descripción de un día festivo.",
)
@limiter.limit("30/minute")
def editar_festivo(
    request: Request,
    id_festivo: UUID, 
    obj_in: FestivoUpdate,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
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
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=calendario.empresa_id if calendario else None,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "festivos", "accion": "editar", "entidad_id": str(id_festivo), "detalles": f"Se editó el festivo {id_festivo}"}
        )

        return festivo_actualizado
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido actualizar el día festivo: {str(error)}"
        )

@router.put(
    "/{id_festivo}/desactivar",
    status_code=status.HTTP_200_OK,
    summary="Dar de baja lógica día festivo",
    description="Desactiva un día festivo sin eliminarlo físicamente.",
)
@limiter.limit("30/minute")
def dar_de_baja_festivo_manual(
    request: Request,
    id_festivo: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/festivos/{id_festivo}/desactivar**
    Realiza una baja lógica (desactivación) de un día festivo concreto.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de baja lógica del festivo {id_festivo} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

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
            detail="No tienes permisos para modificar este festivo."
        )
    
    try:
        festivo.activo = False
        festivo.updated_at = datetime.now()
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=festivo.calendario.empresa_id if festivo.calendario else None,
            accion=AccionAuditoriaEnum.ELIMINACION,
            detalle={"recurso": "festivos", "accion": "desactivar", "entidad_id": str(id_festivo), "detalles": f"Se dio de baja lógica el festivo {id_festivo}"}
        )

        return {"detail": f"Día festivo ({id_festivo}) desactivado correctamente y enviado a la papelera."}
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido desactivar el día festivo: {str(error)}"
        )

@router.get(
    "/calendario/{id_calendario}",
    response_model=List[FestivoResponse],
    summary="Obtener festivos de calendario",
    description="Devuelve los días festivos activos asociados a un calendario laboral.",
)
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

    resultados = (
        db.query(Festivos)
        .options(
            joinedload(Festivos.calendario).joinedload(CalendariosLaborales.empresa)
        )
        .filter(Festivos.calendario_id == id_calendario, Festivos.activo.is_(True))
        .order_by(Festivos.fecha.asc())
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=calendario.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "festivos", "accion": "consultar_por_calendario", "entidad_id": str(id_calendario), "detalles": f"Se consultaron los festivos del calendario {id_calendario}"}
    )

    return resultados
