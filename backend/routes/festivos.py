from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import joinedload, Session

from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum, AccionPermisoEnum, TipoPermisoEnum
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from models.calendarios_laborales import CalendariosLaborales
from models.festivos import Festivos
from models.usuarios import Usuarios
from schemas.festivos import FestivoCreate, FestivoSimpleResponse, FestivoUpdate

# APIRouter agrupa todos los endpoints relacionados con la gestión de festivos bajo el prefijo "/api/festivos".
router = APIRouter(prefix="/api/festivos", tags=["Festivos"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.post(
    '',
    response_model=FestivoSimpleResponse,
    status_code=status.HTTP_201_CREATED,
    summary='Crear día festivo',
    description='Crea un día festivo dentro de un calendario laboral.',
)
@limiter.limit("15/minute")
def crear_festivo(
    request: Request,
    payload: FestivoCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.FESTIVOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/festivos**

    Crea un nuevo día festivo (nacional, autonómico o local) dentro de un calendario laboral.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de día festivo desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    calendario = (
        db.query(CalendariosLaborales).options(
        joinedload(CalendariosLaborales.empresa))
        .filter(CalendariosLaborales.id == payload.calendario_id)
        .first()
    )

    if not calendario:
        print(f"Calendario laboral ({payload.calendario_id}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendario laboral no encontrado.",
        )

    festivo_existente = (
        db.query(Festivos).options(
        joinedload(Festivos.calendario)
        .joinedload(CalendariosLaborales.empresa))
        .filter(Festivos.calendario_id == payload.calendario_id, Festivos.fecha == payload.fecha)
        .first()
    )

    if festivo_existente:
        print(f"Ya existe un día festivo ({festivo_existente.id}) registrado para esa misma fecha en este calendario.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un día festivo registrado para esa misma fecha en este calendario."
        )

    nuevo_festivo = Festivos(
        calendario_id=payload.calendario_id,
        fecha=payload.fecha,
        tipo=payload.tipo,
        descripcion=payload.descripcion
    )

    try:
        db.add(nuevo_festivo)
        db.commit()

        festivo_creado = (
            db.query(Festivos)
            .options(
                joinedload(Festivos.calendario).joinedload(CalendariosLaborales.empresa),
            )
            .filter(Festivos.id == nuevo_festivo.id)
            .first()
        )

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=calendario.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': 'festivos',
                'accion': 'crear',
            },
            trabajador_id=None,
        )

        return festivo_creado
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar crear_festivo: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido guardar el día festivo.')


@router.put(
    '/{id_festivo}',
    response_model=FestivoSimpleResponse,
    summary='Modificar día festivo',
    description='Modifica los datos de un día festivo.',
)
@limiter.limit("30/minute")
def modificar_festivo(
    request: Request,
    id_festivo: UUID,
    payload: FestivoUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.FESTIVOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PUT /api/festivos/{id_festivo}**

    Modifica los datos de un festivo.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación del festivo ({id_festivo}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    festivo = (
        db.query(Festivos).options(
        joinedload(Festivos.calendario)
        .joinedload(CalendariosLaborales.empresa))
        .filter(Festivos.id == id_festivo)
        .first()
    )

    if not festivo:
        print(f"Festivo ({id_festivo}) no encontrado")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Festivo no encontrado.",
        )

    calendario_id = festivo.calendario_id or festivo.calendario_id
    calendario = (
        db.query(CalendariosLaborales).options(
        joinedload(CalendariosLaborales.empresa))
        .filter(CalendariosLaborales.id == calendario_id)
        .first()
    )

    if festivo.calendario_id is not None and festivo.calendario_id != festivo.calendario_id:
        nuevo_calendario = (
            db.query(CalendariosLaborales).options(
            joinedload(CalendariosLaborales.empresa))
            .filter(CalendariosLaborales.id == festivo.calendario_id)
            .first()
        )

        if not nuevo_calendario:
            print(f"Calendario laboral ({festivo.calendario_id}) no encontrado.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Calendario laboral de destino no encontrado.",
            )
        calendario = nuevo_calendario

    setattr(festivo, "calendario_id", calendario_id)
    setattr(festivo, "fecha", payload.fecha)
    setattr(festivo, "tipo", payload.tipo)
    setattr(festivo, "descripcion", payload.descripcion)
    setattr(festivo, "updated_at", datetime.now())

    try:
        db.commit()

        festivo_actualizado = (
            db.query(Festivos).options(
            joinedload(Festivos.calendario)
            .joinedload(CalendariosLaborales.empresa))
            .filter(Festivos.id == id_festivo)
            .first()
        )

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=calendario.empresa_id if calendario else None,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': 'festivos',
                'accion': 'modificar',
            },
            trabajador_id=None,
        )

        return festivo_actualizado
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar modificar_festivo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido actualizar el día festivo',
        )

@router.put(
    '/{id_festivo}/desactivar',
    status_code=status.HTTP_200_OK,
    summary='Desactiva un día festivo',
    description='Desactiva un día festivo.',
)
@limiter.limit("30/minute")
def desactivar_festivo(
    request: Request,
    id_festivo: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.FESTIVOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PUT /api/festivos/{id_festivo}/desactivar**

    Desactiva un día festivo.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de desactivación del festivo ({id_festivo}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
   
    # Validaciones estructurales básicas
    festivo = (
        db.query(Festivos).options(
        joinedload(Festivos.calendario)
        .joinedload(CalendariosLaborales.empresa))
        .filter(Festivos.id == id_festivo)
        .first()
    )

    if not festivo:
        print(f"Festivo ({id_festivo}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Festivo no encontrado."
        )

    try:
        setattr(festivo, 'activo', False)
        setattr(festivo, 'updated_at', datetime.now())
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=festivo.calendario.empresa_id if festivo.calendario else None,
            accion=AccionAuditoriaEnum.ELIMINACION,
            detalle={
                'recurso': 'festivos',
                'accion': 'desactivar',
            },
            trabajador_id=None,
        )

        print(f"Día festivo ({id_festivo}) desactivado correctamente y enviado a la papelera.")
        return {"detail": f"Día festivo desactivado correctamente y enviado a la papelera."}
    except Exception as e:
        db.rollback()
        print(f"No se ha podido desactivar el día festivo: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='No se ha podido desactivar el día festivo.',
        )

@router.get(
    '/calendario/{id_calendario}',
    response_model=List[FestivoSimpleResponse],
    summary='Obtener festivos por calendario laboral',
    description='Obtiene los festivos de un calendario laboral.',
)
@limiter.limit("60/minute")
def obtener_festivos_calendario(
    request: Request,
    id_calendario: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.FESTIVOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/festivos/calendario/{id_calendario}**

    Obtiene los festivos de un calendario laboral.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de festivos para el calendario ({id_calendario}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    calendario = (
        db.query(CalendariosLaborales).options(
        joinedload(CalendariosLaborales.empresa))
        .filter(CalendariosLaborales.id == id_calendario)
        .first()
    )

    if not calendario:
        print(f"Calendario laboral ({id_calendario}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendario laboral no encontrado.",
        )

    resultados = (
        db.query(Festivos).options(
        joinedload(Festivos.calendario)
        .joinedload(CalendariosLaborales.empresa))
        .filter(Festivos.calendario_id == id_calendario, Festivos.activo.is_(True))
        .order_by(Festivos.fecha.asc())
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=calendario.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'festivos',
            'accion': 'consultar_calendario',
        },
        trabajador_id=None,
    )

    return resultados
