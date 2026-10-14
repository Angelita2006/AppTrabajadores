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
from models.empresas import Empresas
from models.resumenes_jornada import ResumenesJornada
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from schemas.resumenes_jornada import ResumenJornadaCreate, ResumenJornadaResponse

# APIRouter agrupa todos los endpoints relacionados con la gestión de resúmenes de jornada bajo el prefijo "/api/resumenes-jornada".
router = APIRouter(prefix="/api/resumenes-jornada", tags=["Resúmenes de Jornada"])
# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "/trabajador/{id_trabajador}",
    response_model=List[ResumenJornadaResponse],
    summary="Obtener resúmenes por trabajador",
)
@limiter.limit("60/minute")
def obtener_resumenes_por_trabajador(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.RESUMENES_JORNADA])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/resumenes-jornada/trabajador/{id_trabajador}**

    Recupera el calendario o histórico validando que pertenezca a la empresa del usuario o a su propio perfil.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de resúmenes del trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    if (
        request.headers.get("Empresa-ID") != str(trabajador.empresa_id)
        and usuario_actual.trabajador_id != id_trabajador
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para consultar los resúmenes de este trabajador."
        )

    resultados = (
        db.query(ResumenesJornada)
        .options(
            joinedload(ResumenesJornada.empresa),
            joinedload(ResumenesJornada.trabajador),
        )
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
        detalle={'recurso': 'resumenes_jornada', 'accion': 'obtener_por_trabajador', 'entidad_id': str(id_trabajador), 'detalles': f'Se consultaron los resúmenes de jornada del trabajador {id_trabajador}'},
        trabajador_id=None,
    )
    db.commit()

    return resultados

@router.get(
    "/empresa/{id_empresa}/fecha/{fecha_dia}",
    response_model=List[ResumenJornadaResponse],
    summary="Obtener cuadro de mandos diario de empresa",
)
@limiter.limit("60/minute")
def obtener_cuadro_mandos_diario_empresa(
    request: Request,
    id_empresa: UUID,
    fecha_dia: date,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.RESUMENES_JORNADA])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/resumenes-jornada/empresa/{id_empresa}/fecha/AAAA-MM-DD**

    Filtra los acumulados de la plantilla diaria validando el acceso a la empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de cuadro de mandos diario para la empresa ({id_empresa}) en fecha {fecha_dia} desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    if request.headers.get("Empresa-ID") != str(id_empresa):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar el cuadro de mandos de esta empresa."
        )

    resultados = (
        db.query(ResumenesJornada)
        .options(
            joinedload(ResumenesJornada.empresa),
            joinedload(ResumenesJornada.trabajador),
        )
        .filter(ResumenesJornada.empresa_id == id_empresa, ResumenesJornada.fecha == fecha_dia)
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={'recurso': 'resumenes_jornada', 'accion': 'cuadro_mandos_diario', 'detalles': f'Se consultó el cuadro de mandos diario para la empresa {id_empresa} en fecha {fecha_dia}'},
        trabajador_id=None,
    )
    db.commit()

    return resultados

@router.post(
    "",
    response_model=ResumenJornadaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear o actualizar resumen de jornada",
)
@limiter.limit("20/minute")
def crear_o_actualizar_resumen(
    request: Request,
    obj_in: ResumenJornadaCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.RESUMENES_JORNADA])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/resumenes-jornada**

    Registra o actualiza el cálculo acumulado diario de un operario validando permisos de tenant.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación del resumen diario desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    if request.headers.get("Empresa-ID") != str(obj_in.empresa_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar o modificar resúmenes de jornada en esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada.")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    if trabajador.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El trabajador indicado no pertenece a la empresa especificada."
        )

    resumen = db.query(ResumenesJornada).filter(
        ResumenesJornada.trabajador_id == obj_in.trabajador_id,
        ResumenesJornada.fecha == obj_in.fecha
    ).first()

    es_creacion = False
    if not resumen:
        resumen = ResumenesJornada(
            empresa_id=obj_in.empresa_id,
            trabajador_id=obj_in.trabajador_id,
            fecha=obj_in.fecha
        )
        db.add(resumen)
        es_creacion = True

    if resumen.cerrado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción denegada. Los cálculos de esta jornada ya han sido consolidados y cerrados."
        )

    setattr(resumen, "minutos_trabajados", obj_in.minutos_trabajados)
    setattr(resumen, "minutos_pausa", obj_in.minutos_pausa)
    setattr(resumen, "minutos_extra", obj_in.minutos_extra)
    setattr(resumen, "tiene_incidencia", obj_in.tiene_incidencia)
    setattr(resumen, "cerrado", obj_in.cerrado)
    setattr(resumen, "hora_entrada", obj_in.hora_entrada)
    setattr(resumen, "hora_salida", obj_in.hora_salida)
    setattr(resumen, "actualizado_en", datetime.now())

    try:
        # Se asegura que el objeto tenga ID en caso de ser nuevo antes de registrar la auditoría
        db.flush()

        accion_audit = AccionAuditoriaEnum.CREACION if es_creacion else AccionAuditoriaEnum.MODIFICACION
        accion_str = "crear_resumen" if es_creacion else "actualizar_resumen"
        detalle_str = f"Se {'creó' if es_creacion else 'actualizó'} el resumen de jornada para el trabajador {obj_in.trabajador_id} en fecha {obj_in.fecha}"

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=obj_in.empresa_id,
            accion=accion_audit,
            detalle={'recurso': 'resumenes_jornada', 'accion': accion_str, 'entidad_id': str(resumen.id), 'detalles': detalle_str},
            trabajador_id=None,
        )

        db.commit()

        resumen_con_relaciones = (
            db.query(ResumenesJornada)
            .options(
                joinedload(ResumenesJornada.empresa),
                joinedload(ResumenesJornada.trabajador),
            )
            .filter(ResumenesJornada.id == resumen.id)
            .first()
        )

        return resumen_con_relaciones
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar crear_o_actualizar_resumen: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido procesar el cierre de jornada en el servidor'
        )

@router.put(
    "/{id_resumen}/cerrar",
    response_model=ResumenJornadaResponse,
    summary="Consolidar y cerrar jornada",
)
@limiter.limit("20/minute")
def consolidar_jornada_mensual(
    request: Request,
    id_resumen: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.RESUMENES_JORNADA])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PUT /api/resumenes-jornada/{id_resumen}/cerrar**

    Consolida de manera definitiva una fila diaria validando permisos de empresa o administración.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de la jornada ({id_resumen}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")
    # Validaciones estructurales básicas

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    resumen = db.query(ResumenesJornada).filter(ResumenesJornada.id == id_resumen).first()
    if not resumen:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resumen diario no localizado.")

    if request.headers.get("Empresa-ID") != str(resumen.empresa_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para cerrar ni consolidar la jornada de esta empresa."
        )

    setattr(resumen, "cerrado", True)
    setattr(resumen, "actualizado_en", datetime.now())

    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=resumen.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={'recurso': 'resumenes_jornada', 'accion': 'consolidar_jornada', 'entidad_id': str(id_resumen), 'detalles': f'Se consolidó y cerró el resumen de jornada {id_resumen}'},
            trabajador_id=None,
        )

        db.commit()

        resumen_consolidado = (
            db.query(ResumenesJornada)
            .options(
                joinedload(ResumenesJornada.empresa),
                joinedload(ResumenesJornada.trabajador),
            )
            .filter(ResumenesJornada.id == id_resumen)
            .first()
        )

        return resumen_consolidado
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar consolidar_jornada_mensual: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido consolidar la jornada'
        )
