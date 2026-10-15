from datetime import date, datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum, AccionPermisoEnum, AlcancePermisoEnum, TipoPermisoEnum
from core.security import (
    get_db_with_advanced_security,
    verificar_permisos_requeridos,
)
from models.centros_trabajo import CentrosTrabajo
from models.contratos import Contratos
from models.contratos_calendarios import ContratosCalendarios
from models.departamentos import Departamentos
from models.empresas import Empresas
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from schemas.contratos import ContratoCreate, ContratoResponse, ContratoUpdate

# APIRouter agrupa todos los endpoints relacionados con la gestión de contratos bajo el prefijo "/api/contratos".
router = APIRouter(prefix="/api/contratos", tags=["Contratos"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "/empresa/{id_empresa}",
    response_model=List[ContratoResponse],
    summary="Obtener contratos laborales por empresa",
    description="Obtiene los contratos laborales de una empresa.",
)
@limiter.limit("60/minute")
def obtener_contratos_laborales_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.CONTRATOS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/contratos/empresa/{id_empresa}**

    Obtiene los contratos laborales de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de contratos laborales para la empresa ({id_empresa}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    contratos = (
        db.query(Contratos).options(
        joinedload(Contratos.empresa),
        joinedload(Contratos.centro_trabajo),
        joinedload(Contratos.trabajador),
        joinedload(Contratos.departamento),
        joinedload(Contratos.calendarios_asociados)
        .joinedload(ContratosCalendarios.calendario))
        .filter(Contratos.empresa_id == id_empresa)
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "contratos",
            'accion': "consultar_empresa",
        },
        trabajador_id=None
    )
    db.commit()

    return contratos


@router.get(
    "/trabajador/{id_trabajador}",
    response_model=List[ContratoResponse],
    summary="Obtener contratos laborales por trabajador",
    description="Obtiene los contratos laborales del trabajador.",
)
@limiter.limit("60/minute")
def obtener_contratos_laborales_trabajador(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.CONTRATOS+"-"+AlcancePermisoEnum.PROPIO])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/contratos/trabajador/{id_trabajador}**

    Obtiene los contratos laborales del trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de contratos para el trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

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

    contratos = (
        db.query(Contratos).options(
        joinedload(Contratos.empresa),
        joinedload(Contratos.centro_trabajo),
        joinedload(Contratos.trabajador),
        joinedload(Contratos.departamento),
        joinedload(Contratos.calendarios_asociados)
        .joinedload(ContratosCalendarios.calendario))
        .filter(Contratos.trabajador_id == id_trabajador)
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "contratos",
            'accion': "consultar_trabajador",
        },
        trabajador_id=id_trabajador
    )
    db.commit()

    return contratos

@router.get(
    "/trabajador/{id_trabajador}/empresa/{id_empresa}/activo",
    response_model=ContratoResponse,
    summary="Obtener contrato laboral activo de un trabajador",
    description="Obtiene el contrato laboral activo de un trabajador.",
)
@limiter.limit("60/minute")
def obtener_contrato_laboral_activo_trabajador_empresa(
    request: Request,
    id_trabajador: UUID,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.CONTRATOS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/contratos/trabajador/{id_trabajador}/empresa/{id_empresa}/activo**

    Obtiene el contrato laboral activo de un trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de contrato laboral activo para el trabajador ({id_trabajador}) en la empresa ({id_empresa}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    hoy = date.today()
    contrato_activo = (
        db.query(Contratos).options(
        joinedload(Contratos.empresa),
        joinedload(Contratos.centro_trabajo),
        joinedload(Contratos.trabajador),
        joinedload(Contratos.departamento),
        joinedload(Contratos.calendarios_asociados)
        .joinedload(ContratosCalendarios.calendario))
        .filter(
            Contratos.trabajador_id == id_trabajador,
            Contratos.empresa_id == id_empresa,
            Contratos.activo.is_(True),
            Contratos.fecha_inicio <= hoy,
            or_(Contratos.fecha_fin.is_(None), Contratos.fecha_fin >= hoy)
        )
        .order_by(Contratos.fecha_inicio.desc())
        .first()
    )

    if not contrato_activo:
        print(f"No se ha encontrado ningún contrato activo para el trabajador ({id_trabajador}) en la empresa seleccionada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ningún contrato activo para el trabajador en la empresa seleccionada."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "contratos",
            'accion': "consultar_activo",
        },
        trabajador_id=id_trabajador
    )
    db.commit()

    return contrato_activo
@router.post(
    "",
    response_model=ContratoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear contrato laboral",
    description="Crear un nuevo contrato laboral.",
)
@limiter.limit("20/minute")
def crear_contrato_laboral(
    request: Request,
    payload: ContratoCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR+"-"+TipoPermisoEnum.CONTRATOS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **POST /api/contratos**

    Crear un nuevo contrato laboral.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de contrato laboral desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == payload.empresa_id).first()
    if not empresa:
        print(f"Empresa ({payload.empresa_id}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa no encontrada."
        )

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == payload.trabajador_id, Trabajadores.activo.is_(True)).first()
    if not trabajador:
        print(f"Trabajador ({payload.trabajador_id}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador no encontrado."
        )

    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == payload.centro_trabajo_id, CentrosTrabajo.activo.is_(True)).first()
    if not centro:
        print(f"Centro de trabajo ({payload.centro_trabajo_id}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo no encontrado."
        )

    if trabajador.empresa_id != payload.empresa_id or centro.empresa_id != payload.empresa_id:
        print(f"El trabajador ({trabajador.empresa_id}), centro de trabajo ({centro.empresa_id}) y contrato laboral ({payload.empresa_id}) deben pertenecer a la misma empresa.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El trabajador, centro de trabajo y contrato laboral deben pertenecer a la misma empresa.")

    departamento = db.query(Departamentos).filter(
        Departamentos.id == payload.departamento_id,
        Departamentos.empresa_id == payload.empresa_id,
        Departamentos.activo.is_(True),
    ).first()
    if not departamento:
        print(f"Departamento ({payload.departamento_id}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Departamento no encontrado."
        )

    contrato_activo = db.query(Contratos).filter(
        Contratos.empresa_id == payload.empresa_id,
        Contratos.trabajador_id == payload.trabajador_id,
        Contratos.activo.is_(True),
    ).first()
    if contrato_activo:
        print(f"El trabajador ({payload.trabajador_id}) ya tiene un contrato activo en esta empresa ({payload.empresa_id}).")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El trabajador ya tiene un contrato activo en esta empresa; finaliza el anterior antes de crear otro.")

    nuevo_contrato = Contratos(
        trabajador_id=payload.trabajador_id,
        empresa_id=payload.empresa_id,
        centro_trabajo_id=payload.centro_trabajo_id,
        tipo_contrato=payload.tipo_contrato,
        tipo_jornada=payload.tipo_jornada,
        horas_semana=payload.horas_semana,
        fecha_inicio=payload.fecha_inicio,
        departamento_id=payload.departamento_id,
        puesto_trabajo=payload.puesto_trabajo,
        categoria_profesional=payload.categoria_profesional,
        fecha_fin=payload.fecha_fin,
        activo=True
    )

    try:
        db.add(nuevo_contrato)
        db.commit()

        contrato_creado = (
            db.query(Contratos).options(
            joinedload(Contratos.empresa),
            joinedload(Contratos.centro_trabajo),
            joinedload(Contratos.trabajador),
            joinedload(Contratos.departamento),
            joinedload(Contratos.calendarios_asociados)
            .joinedload(ContratosCalendarios.calendario))
            .filter(Contratos.id == nuevo_contrato.id)
            .first()
        )

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=payload.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': "contratos",
                'accion': "crear",
            },
            trabajador_id=payload.trabajador_id
        )
        db.commit()

        return contrato_creado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido registrar el contrato: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido registrar el contrato."
        )

@router.put(
    "/{id_contrato}/finalizar",
    response_model=ContratoResponse,
    summary="Finalizar contrato laboral",
    description="Establece la fecha de finalización el contrato laboral.",
)
@limiter.limit("20/minute")
def finalizar_contrato_laboral(
    request: Request,
    id_contrato: UUID,
    fecha_fin: date,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.CONTRATOS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/contratos/{id_contrato}/finalizar**

    Establece la fecha de finalización el contrato laboral.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de finalización del contrato laboral ({id_contrato}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    contrato = db.query(Contratos).filter(Contratos.id == id_contrato).first()
    if not contrato:
        print(f"Contrato laboral ({id_contrato}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contrato laboral no encontrado."
        )

    if contrato.fecha_inicio > fecha_fin:
        print(f"La fecha de fin ({fecha_fin}) no puede ser anterior al inicio del contrato laboral ({contrato.fecha_inicio}).")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción bloqueada: La fecha de cese no puede ser anterior al inicio del contrato laboral."
        )

    try:
        setattr(contrato, "activo", False)
        setattr(contrato, "fecha_fin", fecha_fin)
        setattr(contrato, "updated_at", datetime.now())

        db.commit()

        contrato_finalizado = (
            db.query(Contratos).options(
            joinedload(Contratos.empresa),
            joinedload(Contratos.centro_trabajo),
            joinedload(Contratos.trabajador),
            joinedload(Contratos.departamento),
            joinedload(Contratos.calendarios_asociados)
            .joinedload(ContratosCalendarios.calendario))
            .filter(Contratos.id == id_contrato)
            .first()
        )

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=contrato.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': "contratos",
                'accion': "finalizar",
            },
            trabajador_id=contrato.trabajador_id
        )
        db.commit()

        return contrato_finalizado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido finalizar el contrato laboral: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido finalizar el contrato laboral."
        )

@router.put(
    "/{id_contrato}",
    response_model=ContratoResponse,
    summary="Modificar contrato laboral",
    description="Modifica los datos de un contrato laboral existente.",
)
@limiter.limit("20/minute")
def modificar_contrato_laboral(
    request: Request,
    id_contrato: UUID,
    payload: ContratoUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.CONTRATOS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/contratos/{id_contrato}**

    Modifica los datos de un contrato laboral existente.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación del contrato laboral ({id_contrato}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    contrato = db.query(Contratos).filter(Contratos.id == id_contrato).first()
    if not contrato:
        print(f"Contrato laboral ({id_contrato}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contrato laboral no encontrado."
        )

    try:
        setattr(contrato, "tipo_contrato", payload.tipo_contrato)
        setattr(contrato, "tipo_jornada", payload.tipo_jornada)
        setattr(contrato, "horas_semana", payload.horas_semana)
        setattr(contrato, "puesto_trabajo", payload.puesto_trabajo)
        setattr(contrato, "categoria_profesional", payload.categoria_profesional)
        setattr(contrato, "pdf_url", payload.pdf_url)
        setattr(contrato, "fecha_inicio", payload.fecha_inicio)
        setattr(contrato, "fecha_fin", payload.fecha_fin)
        setattr(contrato, "activo", payload.activo)
        setattr(contrato, "updated_at", datetime.now())
        db.commit()

        contrato_actualizado = (
            db.query(Contratos).options(
            joinedload(Contratos.empresa),
            joinedload(Contratos.centro_trabajo),
            joinedload(Contratos.trabajador),
            joinedload(Contratos.departamento),
            joinedload(Contratos.calendarios_asociados)
            .joinedload(ContratosCalendarios.calendario))
            .filter(Contratos.id == id_contrato)
            .first()
        )

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=contrato.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': "contratos",
                'accion': "modificar",
            },
            trabajador_id=contrato.trabajador_id
        )
        db.commit()

        return contrato_actualizado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido actualizar el contrato laboral: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido actualizar el contrato laboral."
        )


@router.delete(
    "/{id_contrato}",
    response_model=ContratoResponse,
    summary="Eliminar contrato laboral",
    description="Elimina el contrato laboral.",
)
@limiter.limit("20/minute")
def eliminar_contrato_laboral(
    request: Request,
    id_contrato: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.ELIMINAR+"-"+TipoPermisoEnum.CONTRATOS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **DELETE /api/contratos/{id_contrato}**

    Elimina el contrato laboral.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de eliminación del contrato laboral ({id_contrato}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    contrato = db.query(Contratos).filter(Contratos.id == id_contrato).first()
    if not contrato:
        print(f"Contrato laboral ({id_contrato}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contrato laboral no encontrado."
        )

    try:
        db.delete(contrato)
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=contrato.empresa_id,
            accion=AccionAuditoriaEnum.ELIMINACION,
            detalle={
                'recurso': "contratos",
                'accion': "eliminar",
            },
            trabajador_id=contrato.trabajador_id
        )
        db.commit()

        print(f"El contrato ({id_contrato}) ha sido eliminado correctamente.")
        return {"detail": "El contrato ha sido eliminado correctamente."}
    except Exception as e:
        db.rollback()
        print(f"No se ha podido eliminar el contrato laboral: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido eliminar el contrato laboral."
        )

