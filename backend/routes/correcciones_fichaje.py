from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session, joinedload

from core.jornada import calcular_resumen_jornada
from core.auditoria import registrar_auditoria
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    AlcancePermisoEnum,
    EstadoCorreccionEnum,
    EstadoFichajeEnum,
    MetodoFichajeEnum,
    OrigenFichajeEnum,
    TipoCorreccionEnum,
    TipoPermisoEnum,
)
from core.security import (
    get_db_with_advanced_security,
    verificar_permisos_requeridos,
)
from core.utils import calcular_hash_fichaje, procesar_y_guardar_firma
from models.centros_trabajo import CentrosTrabajo
from models.contratos import Contratos
from models.correcciones_fichaje import CorreccionesFichaje
from models.empresas import Empresas
from models.fichajes import Fichajes
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from schemas.correcciones_fichaje import (
    CorreccionFichajeCreate,
    CorreccionFichajeResponse,
    CorreccionFichajeUpdate,
)

# APIRouter agrupa todos los endpoints relacionados con la gestión de correcciones de fichaje bajo el prefijo "/api/correcciones".
router = APIRouter(prefix="/api/correcciones", tags=["Correcciones de Fichaje"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "/empresa/{id_empresa}",
    response_model=List[CorreccionFichajeResponse],
    summary="Obtener correcciones de fichajes por empresa",
    description="Obtener correcciones de fichajes de una empresa.",
)
@limiter.limit("60/minute")
def obtener_correcciones_fichajes_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.CORRECCIONES_FICHAJE])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/correcciones/empresa/{id_empresa}**

    Obtener correcciones de fichajes de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de correcciones de fichajes para la empresa ({id_empresa}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    resultados = (
        db.query(CorreccionesFichaje).options(
        joinedload(CorreccionesFichaje.empresa),
        joinedload(CorreccionesFichaje.trabajador),
        joinedload(CorreccionesFichaje.usuario_solicitador),
        joinedload(CorreccionesFichaje.usuario_aprobador))
        .filter(CorreccionesFichaje.empresa_id == id_empresa)
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "correcciones_fichaje",
            'accion': "consultar_empresa",
        },
        trabajador_id=None
    )
    db.commit()

    return resultados

@router.get(
    "/trabajador/{id_trabajador}",
    response_model=List[CorreccionFichajeResponse],
    summary="Obtener correcciones por trabajador",
    description="Obtiene las correcciones de fichajes de un trabajador.",
)
@limiter.limit("60/minute")
def obtener_correcciones_fichajes_trabajador(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([
        AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.CORRECCIONES_FICHAJE + "-" + AlcancePermisoEnum.PROPIO
    ])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/correcciones/trabajador/{id_trabajador}**

    Obtiene las correcciones de fichajes de un trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de correcciones de fichajes para el trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado."
        )

    if (
        getattr(request.state, "alcance_efectivo", None) == AlcancePermisoEnum.PROPIO.value
        and trabajador.usuario_id != usuario_actual.id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    resultados = (
        db.query(CorreccionesFichaje).options(
        joinedload(CorreccionesFichaje.empresa),
        joinedload(CorreccionesFichaje.trabajador),
        joinedload(CorreccionesFichaje.usuario_solicitador),
        joinedload(CorreccionesFichaje.usuario_aprobador))
        .filter(CorreccionesFichaje.trabajador_id == id_trabajador)
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "correcciones_fichaje",
            'accion': "consultar_trabajador",
        },
        trabajador_id=id_trabajador
    )
    db.commit()

    return resultados
@router.post(
    "",
    response_model=CorreccionFichajeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear corrección de fichaje",
    description="Crea una nueva corrección de fichaje en estado 'pendiente' por defecto.",
)
@limiter.limit("20/minute")
def crear_correccion_fichaje(
    request: Request,
    payload: CorreccionFichajeCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR+"-"+TipoPermisoEnum.CORRECCIONES_FICHAJE+"-"+AlcancePermisoEnum.PROPIO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **POST /api/correcciones**

    Crea una nueva corrección de fichaje en estado 'pendiente' por defecto.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de corrección de fichaje desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == payload.empresa_id).first()
    if not empresa:
        print(f"Empresa ({payload.empresa_id}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa no encontrada."
        )

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == payload.trabajador_id).first()
    if not trabajador:
        print(f"Trabajador ({payload.trabajador_id}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado."
        )

    if (
        getattr(request.state, "alcance_efectivo", None) == AlcancePermisoEnum.PROPIO.value
        and trabajador.usuario_id != usuario_actual.id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo puedes solicitar correcciones para tus propios fichajes.")

    if not payload.firma_solicitante:
        print("La corrección de fichaje debe incluir la firma digital de quien la solicita")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La corrección de fichaje debe incluir la firma digital de quien la solicita.",
        )

    if payload.fichaje_afectado_id:
        fichaje = db.query(Fichajes).filter(Fichajes.id == payload.fichaje_afectado_id).first()
        if not fichaje:
            print(f"Fichaje afectado ({payload.fichaje_afectado_id}) no encontrado.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fichaje afectado no encontrado."
            )

    ruta_relativa_firma = None
    data_firma = getattr(payload, "firma_solicitante", None)

    if data_firma and isinstance(data_firma, str):
        try:
            ruta_relativa_firma = procesar_y_guardar_firma(data_firma)
        except Exception as e:
            print(f"No se pudo procesar la imagen de la firma digital del solicitante adjunta: {str(e)}.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se pudo procesar la imagen de la firma digital del solicitante adjunta."
            )

    nueva_correccion_fichaje = CorreccionesFichaje(
        empresa_id=payload.empresa_id,
        trabajador_id=payload.trabajador_id,
        tipo_correccion=payload.tipo_correccion,
        tipo_evento=payload.tipo_evento,
        valor_nuevo=payload.valor_nuevo,
        motivo=payload.motivo,
        usuario_solicitador_id=usuario_actual.id,
        fichaje_afectado_id=payload.fichaje_afectado_id,
        valor_anterior=payload.valor_anterior,
        firma_solicitante=ruta_relativa_firma,
        estado=EstadoCorreccionEnum.PENDIENTE
    )

    try:
        db.add(nueva_correccion_fichaje)
        db.commit()

        correccion_creada = (
            db.query(CorreccionesFichaje).options(
            joinedload(CorreccionesFichaje.empresa),
            joinedload(CorreccionesFichaje.trabajador),
            joinedload(CorreccionesFichaje.usuario_solicitador),
            joinedload(CorreccionesFichaje.usuario_aprobador))
            .filter(CorreccionesFichaje.id == nueva_correccion_fichaje.id)
            .first()
        )

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=payload.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': "correcciones_fichaje",
                'accion': "crear",
            },
            trabajador_id=payload.trabajador_id
        )
        db.commit()

        return correccion_creada
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear la corrección de fichaje: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido crear la corrección de fichaje."
        )


@router.put(
    "/{id_correccion}/resolver",
    response_model=CorreccionFichajeResponse,
    summary="Resolver corrección de fichaje",
    description="Resolver corrección de fichaje.",
)
@limiter.limit("20/minute")
def resolver_correccion_fichaje(
    request: Request,
    id_correccion: UUID,
    payload: CorreccionFichajeUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.CORRECCIONES_FICHAJE])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /{id_correccion}/resolver**

    Resolver corrección de fichaje.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de resolución de la corrección de fichaje ({id_correccion}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    correccion_fichaje = (
        db.query(CorreccionesFichaje).options(
        joinedload(CorreccionesFichaje.empresa),
        joinedload(CorreccionesFichaje.trabajador),
        joinedload(CorreccionesFichaje.solicitado_por_usuario),
        joinedload(CorreccionesFichaje.aprobado_por_usuario))
        .filter(CorreccionesFichaje.id == id_correccion)
        .first()
    )

    if not correccion_fichaje:
        print(f"Corrección de fichaje ({id_correccion}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Corrección de fichaje no encontrada."
        )

    if correccion_fichaje.estado != EstadoCorreccionEnum.PENDIENTE:
        print(f"Acción bloqueada: Esta corrección de fichaje ({id_correccion}) ya fue resuelta previamente.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción bloqueada: Esta corrección de fichaje ya fue resuelta previamente."
        )

    if correccion_fichaje.usuario_solicitador_id == usuario_actual.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes resolver una correccion de fichaje que has solicitado.",
        )

    if payload.estado not in (EstadoCorreccionEnum.APROBADA, EstadoCorreccionEnum.RECHAZADA):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La resolucion debe ser de aprobacion o rechazo.",
        )

    if not payload.firma_resolutor:
        print("La resolución debe incluir la firma digital de quien la resuelve.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La resolución debe incluir la firma digital de quien la resuelve.",
        )

    ruta_relativa_firma = None

    if payload.firma_resolutor and isinstance(payload.firma_resolutor, str):
        try:
            ruta_relativa_firma = procesar_y_guardar_firma(payload.firma_resolutor)
        except Exception as e:
            print(f"No se pudo procesar la imagen de la firma digital del resolutor adjunta: {str(e)}.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se pudo procesar la imagen de la firma digital del resolutor adjunta."
            )

    try:
        setattr(correccion_fichaje, "estado", payload.estado)
        setattr(correccion_fichaje, "usuario_aprobador_id", usuario_actual.id)
        setattr(correccion_fichaje, "fecha_resolucion", datetime.now())
        setattr(correccion_fichaje, "firma_resolutor", ruta_relativa_firma)

        fecha_hora_propuesta: datetime | None = None

        if payload.estado == EstadoCorreccionEnum.APROBADA:
            fichaje_original = db.query(Fichajes).filter(Fichajes.id == correccion_fichaje.fichaje_afectado_id).first()

            if not fichaje_original:
                print(f"Fichaje original ({correccion_fichaje.fichaje_afectado_id}) no encontrado.")
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichaje original no encontrado.")

            if correccion_fichaje.tipo_correccion in [TipoCorreccionEnum.MODIFICACION, TipoCorreccionEnum.ALTA_MANUAL]:
                v_nuevo = correccion_fichaje.valor_nuevo or {}
                fecha_str = v_nuevo.get("fecha_descuadre")
                hora_str = v_nuevo.get("hora_propuesta")

                if not fecha_str or not hora_str:
                    print("Datos de tiempo insuficientes en la solicitud.")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Datos de tiempo insuficientes en la solicitud."
                    )

                fecha_hora_propuesta = datetime.fromisoformat(f"{fecha_str}T{hora_str}:00")

                sha256_calculado = calcular_hash_fichaje(
                    id_fichaje=str(fichaje_original.id),
                    empresa_id=str(correccion_fichaje.empresa_id),
                    trabajador_id=str(correccion_fichaje.trabajador_id),
                    tipo_evento=correccion_fichaje.tipo_evento.value,
                    fecha_hora_iso=fecha_hora_propuesta.isoformat(),
                    metodo_fichaje=fichaje_original.metodo_fichaje,
                    firma_digital=str(correccion_fichaje.firma_resolutor)
                )

                centro_id = None
                if fichaje_original and fichaje_original.centro_trabajo_id:
                    centro_id = fichaje_original.centro_trabajo_id

                if not centro_id:
                    contrato = db.query(Contratos).filter(Contratos.trabajador_id == correccion_fichaje.trabajador_id).first()
                    if contrato and contrato.centros_trabajo_relaciones:
                        centro_id = contrato.centros_trabajo_relaciones[0].centro_trabajo_id

                if not centro_id:
                    print("No se pudo procesar: El trabajador no posee un contrato con centro de trabajo asignado.")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No se pudo procesar: El trabajador no posee un contrato con centro de trabajo asignado."
                    )

                latitud = None
                longitud = None

                centro_trabajo = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == centro_id).first()
                if centro_trabajo:
                    latitud = getattr(centro_trabajo, 'latitud', None)
                    longitud = getattr(centro_trabajo, 'longitud', None)

                nuevo_fichaje = Fichajes(
                    empresa_id=correccion_fichaje.empresa_id,
                    trabajador_id=correccion_fichaje.trabajador_id,
                    centro_trabajo_id=centro_id,
                    tipo_evento=correccion_fichaje.tipo_evento,
                    fecha_hora=fecha_hora_propuesta,
                    fecha_hora_dispositivo=fecha_hora_propuesta,
                    metodo_fichaje=MetodoFichajeEnum.WEB,
                    origen=OrigenFichajeEnum.CORRECCION_RRHH,
                    estado=EstadoFichajeEnum.VALIDO,
                    hash_integridad=sha256_calculado,
                    latitud=latitud,
                    longitud=longitud,
                    fichaje_sustituido_id=correccion_fichaje.fichaje_afectado_id,
                    firma_digital=correccion_fichaje.firma_solicitante,
                    observaciones=f"Fichaje corrector mediante incidencia: {correccion_fichaje.motivo}"
                )
                db.add(nuevo_fichaje)

            if fichaje_original is not None and getattr(fichaje_original, 'fecha_hora', None):
                fecha_resumen = fichaje_original.fecha_hora.date()
            elif fecha_hora_propuesta is not None:
                fecha_resumen = fecha_hora_propuesta.date()
            else:
                fecha_resumen = datetime.now().date()

            calcular_resumen_jornada(db, correccion_fichaje.empresa_id, correccion_fichaje.trabajador_id, fecha_resumen)

        db.commit()

        incidencia_actualizada = (
            db.query(CorreccionesFichaje).options(
            joinedload(CorreccionesFichaje.empresa),
            joinedload(CorreccionesFichaje.trabajador),
            joinedload(CorreccionesFichaje.solicitado_por_usuario),
            joinedload(CorreccionesFichaje.aprobado_por_usuario))
            .filter(CorreccionesFichaje.id == id_correccion)
            .first()
        )

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=correccion_fichaje.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': "correcciones_fichaje",
                'accion': "resolver",
            },
            trabajador_id=correccion_fichaje.trabajador_id
        )
        db.commit()

        return incidencia_actualizada
    except Exception as e:
        db.rollback()
        print(f"No se ha podido resolver la corrección de fichajes: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido resolver la corrección de fichajes."
        )

@router.delete(
    "/{id_correccion}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar corrección de fichaje",
    description="Elimina una corrección de fichaje.",
)
@limiter.limit("20/minute")
def eliminar_correccion_fichaje(
    request: Request,
    id_correccion: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.ELIMINAR+"-"+TipoPermisoEnum.CORRECCIONES_FICHAJE])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **DELETE /api/correcciones/{id_correccion}**

    Elimina una corrección de fichaje.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de eliminación de la corrección de fichaje ({id_correccion}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    correccion_fichaje = db.query(CorreccionesFichaje).filter(CorreccionesFichaje.id == id_correccion).first()
    if not correccion_fichaje:
        print(f"Corrección de fichaje ({id_correccion}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Corrección de fichaje no encontrada."
        )

    try:
        db.delete(correccion_fichaje)
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=correccion_fichaje.empresa_id,
            accion=AccionAuditoriaEnum.ELIMINACION,
            detalle={
                'recurso': "correcciones_fichaje",
                'accion': "eliminar",
            },
            trabajador_id=correccion_fichaje.trabajador_id
        )
        db.commit()

        return
    except Exception as error:
        db.rollback()
        print(f"No se ha podido eliminar la corrección de fichaje: {str(error)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido eliminar la corrección de fichaje."
        )
