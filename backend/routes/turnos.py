from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import joinedload, Session

from core.auditoria import registrar_auditoria
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    TipoPermisoEnum,
)
from core.security import (
    get_db_with_advanced_security,
    verificar_permisos_requeridos,
)
from models.empresas import Empresas
from models.turnos import Turnos
from models.usuarios import Usuarios
from schemas.turnos import TurnoCreate, TurnoResponse, TurnoUpdate

# APIRouter agrupa todos los endpoints relacionados con la gestión de turnos bajo el prefijo "/api/turnos".
router = APIRouter(prefix="/api/turnos", tags=["Turnos Laborales"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "/empresa/{id_empresa}",
    response_model=List[TurnoResponse],
    summary="Obtener turnos por empresa",
    description="Obtiene los turnos de una empresa.",
)
@limiter.limit("60/minute")
def obtener_turnos_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.TURNOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/turnos/empresa/{id_empresa}**

    Obtiene los turnos de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de turnos de la empresa ({id_empresa}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        print(f"Empresa ({id_empresa}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa no encontrada."
        )

    turnos = (
        db.query(Turnos).options(
        joinedload(Turnos.empresa))
        .filter(Turnos.empresa_id == id_empresa, Turnos.activo.is_(True))
        .order_by(Turnos.nombre.asc())
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'turnos',
            'accion': 'consultar_empresa',
        },
        trabajador_id=None,
    )
    db.commit()

    return turnos


@router.get(
    "/{id_turno}",
    response_model=TurnoResponse,
    summary="Obtener turno por id",
    description="Obtiene un turno por su id.",
)
@limiter.limit("60/minute")
def obtener_turno_id(
    request: Request,
    id_turno: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.TURNOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/turnos/{id_turno}**

    Obtiene un turno por su id.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta del turno ({id_turno}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    turno = (
        db.query(Turnos).options(
        joinedload(Turnos.empresa))
        .filter(Turnos.id == id_turno)
        .first()
    )

    if not turno:
        print(f"Turno ({id_turno}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turno no encontrado."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=turno.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'turnos',
            'accion': 'consultar_id',
        },
        trabajador_id=None,
    )
    db.commit()

    return turno

@router.post(
    "",
    response_model=TurnoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear turno",
    description="Crea un nuevo turno en una empresa.",
)
@limiter.limit("20/minute")
def crear_turno(
    request: Request,
    payload: TurnoCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.TURNOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/turnos**

    Crea un nuevo turno en una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de turno desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    try:
        empresa = db.query(Empresas).filter(Empresas.id == payload.empresa_id).first()
        if not empresa:
            print(f"Empresa ({payload.empresa_id}) no encontrada.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa no encontrada."
            )

        nuevo_turno = Turnos(
            empresa_id=payload.empresa_id,
            nombre=payload.nombre,
            hora_inicio=payload.hora_inicio,
            hora_fin=payload.hora_fin,
            duracion_pausa_minutos=payload.duracion_pausa_minutos,
            dias_semana=payload.dias_semana
        )

        db.add(nuevo_turno)
        db.flush()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=payload.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': 'turnos',
                'accion': 'crear',
            },
            trabajador_id=None,
        )

        db.commit()

        turno_con_relacion = (
            db.query(Turnos).options(
            joinedload(Turnos.empresa))
            .filter(Turnos.id == nuevo_turno.id)
            .first()
        )

        return turno_con_relacion
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear el turno: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido crear el turno.'
        )


@router.put(
    "/{id_turno}/editar",
    response_model=TurnoResponse,
    summary="Modificar turno",
    description="Modifica un turno validando la pertenencia a la empresa o rol de administrador.",
)
@limiter.limit("20/minute")
def editar_turno(
    request: Request,
    id_turno: UUID,
    payload: TurnoUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.TURNOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PUT /api/turnos/{id_turno}/editar**

    Modifica un turno validando la pertenencia a la empresa o rol de administrador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación del turno ({id_turno}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    turno = db.query(Turnos).filter(Turnos.id == id_turno).first()
    if not turno:
        print(f"Turno ({id_turno}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turno no encontrado."
        )
    
    update_data = payload.dict(exclude_unset=True)

    for key, value in update_data.items():
        if hasattr(turno, key):
            setattr(turno, key, value)

    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=turno.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': 'turnos',
                'accion': 'modificar',
            },
            trabajador_id=None,
        )
        db.commit()

        turno_actualizado = (
            db.query(Turnos).options(
            joinedload(Turnos.empresa))
            .filter(Turnos.id == id_turno)
            .first()
        )

        return turno_actualizado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido modificar el turno: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido modificar el turno.'
        )

@router.put(
    "/{id_turno}/desactivar",
    status_code=status.HTTP_200_OK,
    summary="Desactivar turno",
    description="Desactiva un turno.",
)
@limiter.limit("20/minute")
def desactivar_turno(
    request: Request,
    id_turno: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.TURNOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PUT /api/turnos/{id_turno}/desactivar**

    Desactiva un turno.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de baja lógica del turno ({id_turno}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    turno = db.query(Turnos).filter(Turnos.id == id_turno).first()
    if not turno:
        print(f"Turno ({id_turno}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turno no encontrado.",
        )

    setattr(turno, 'activo', False)
    setattr(turno, 'updated_at', datetime.now())

    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=turno.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': 'turnos',
                'accion': 'desactivar',
            },
            trabajador_id=None,
        )
        db.commit()

        print(f"Turno {id_turno} desactivado correctamente y enviado a la papelera.")
        return {"detail": f"Turno desactivado correctamente y enviado a la papelera."}
    except Exception as e:
        db.rollback()
        print(f"No se ha podido desactivar el turno: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='No se ha podido desactivar el turno.',
        )
