from datetime import date, datetime
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
from models.resumenes_jornada import ResumenesJornada
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from schemas.resumenes_jornada import ResumenJornadaResponse

# APIRouter agrupa todos los endpoints relacionados con la gestión de resúmenes de jornada bajo el prefijo "/api/resumenes-jornada".
router = APIRouter(prefix="/api/resumenes-jornada", tags=["Resúmenes de Jornada"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "/trabajador/{id_trabajador}",
    response_model=List[ResumenJornadaResponse],
    summary="Obtener resúmenes de jornada por trabajador",
    description="Obtiene el historial de los resúmenes de jornada del trabajador.",
)
@limiter.limit("60/minute")
def obtener_resumenes_jornada_trabajador(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.RESUMENES_JORNADA])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/resumenes-jornada/trabajador/{id_trabajador}**

    Obtiene el historial de los resúmenes de jornada del trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de resúmenes de jornada del trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    if not usuario_actual.activo:
        print("La cuenta de usuario se encuentra inactiva.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Trabajador no encontrado."
        )

    resultados = (
        db.query(ResumenesJornada).options(
        joinedload(ResumenesJornada.empresa),
        joinedload(ResumenesJornada.trabajador))
        .filter(ResumenesJornada.trabajador_id == id_trabajador)
        .order_by(ResumenesJornada.fecha.desc())
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'resumenes_jornada',
            'accion': 'obtener_trabajador',
        },
        trabajador_id=id_trabajador,
    )
    db.commit()

    return resultados

@router.get(
    "/empresa/{id_empresa}/fecha/{fecha_dia}",
    response_model=List[ResumenJornadaResponse],
    summary="Obtener resumen de jornada de un día por empresa",
    description="Obtiene el resumen de jornada de una fecha por empresa.",
)
@limiter.limit("60/minute")
def obtener_resumen_jornada_empresa(
    request: Request,
    id_empresa: UUID,
    fecha_dia: date,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.RESUMENES_JORNADA])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/resumenes-jornada/empresa/{id_empresa}/fecha/AAAA-MM-DD**

    Obtiene el resumen de jornada de una fecha por empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de cuadro de mandos diario para la empresa ({id_empresa}) en fecha {fecha_dia} desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    if not usuario_actual.activo:
        print("La cuenta de usuario se encuentra inactiva.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    resultados = (
        db.query(ResumenesJornada).options(
        joinedload(ResumenesJornada.empresa),
        joinedload(ResumenesJornada.trabajador))
        .filter(ResumenesJornada.empresa_id == id_empresa, ResumenesJornada.fecha == fecha_dia)
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'resumenes_jornada',
            'accion': 'consultar_dia_empresa',
        },
        trabajador_id=None,
    )
    db.commit()

    return resultados

@router.put(
    "/{id_resumen}/cerrar",
    response_model=ResumenJornadaResponse,
    summary="Consolidar y cerrar jornada",
    description="Consolida un resumen de jornada.",
)
@limiter.limit("20/minute")
def consolidar_resumen_jornada(
    request: Request,
    id_resumen: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.RESUMENES_JORNADA])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PUT /api/resumenes-jornada/{id_resumen}/cerrar**

    Consolida un resumen de jornada.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación del resumen de jornada ({id_resumen}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    if not usuario_actual.activo:
        print("La cuenta de usuario se encuentra inactiva.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    resumen = db.query(ResumenesJornada).filter(ResumenesJornada.id == id_resumen).first()
    if not resumen:
        print(f"Resumen de jornada ({id_resumen}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Resumen de jornada no encontrado."
        )

    setattr(resumen, "cerrado", True)
    setattr(resumen, "updated_at", datetime.now())

    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=resumen.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': 'resumenes_jornada',
                'accion': 'consolidar',
            },
            trabajador_id=resumen.trabajador_id,
        )

        db.commit()

        resumen_consolidado = (
            db.query(ResumenesJornada).options(
            joinedload(ResumenesJornada.empresa),
            joinedload(ResumenesJornada.trabajador))
            .filter(ResumenesJornada.id == id_resumen)
            .first()
        )

        return resumen_consolidado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido consolidar el resumen de jornada: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido consolidar el resumen de jornada.'
        )
