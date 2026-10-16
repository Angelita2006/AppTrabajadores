from datetime import date, datetime
from pathlib import Path
from typing import List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload, selectinload

from core.auditoria import registrar_auditoria
from core.config import obtener_directorio_archivos
from core.enums import AccionAuditoriaEnum, AccionPermisoEnum, AlcancePermisoEnum, TipoPermisoEnum
from core.security import (
    get_db_with_advanced_security,
    verificar_permisos_requeridos,
)
from models.centros_trabajo import CentrosTrabajo
from models.contratos import Contratos
from models.contratos_centros_trabajo import ContratosCentrosTrabajo
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

@router.put(
    "/{id_contrato}/documento",
    response_model=ContratoResponse,
    summary="Subir el documento PDF del contrato",
    description="Guarda el PDF del contrato en almacenamiento privado y lo vincula al expediente laboral.",
)
@limiter.limit("10/minute")
async def subir_documento_contrato(
    request: Request,
    id_contrato: UUID,
    file: UploadFile = File(...),
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([
        AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.CONTRATOS
    ])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """Sube un PDF validado y lo asocia al contrato existente."""
    contrato = db.query(Contratos).filter(Contratos.id == id_contrato).first()
    if contrato is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato no encontrado.")
    contenido = await file.read(15_000_001)
    if len(contenido) > 15_000_000:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="El PDF supera el límite de 15 MB.")
    if file.content_type != "application/pdf" or not contenido.startswith(b"%PDF-"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo debe ser un PDF válido.")

    carpeta = obtener_directorio_archivos() / "contratos"
    carpeta.mkdir(parents=True, exist_ok=True)
    nombre_archivo = f"contrato_{id_contrato}_{uuid4().hex}.pdf"
    destino = carpeta / nombre_archivo
    try:
        destino.write_bytes(contenido)
        setattr(contrato, "pdf_url", f"/api/archivos/contratos/{nombre_archivo}")
        setattr(contrato, "updated_at", datetime.now())
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=contrato.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "contratos", "accion": "subir_documento"},
            trabajador_id=contrato.trabajador_id,
        )
        db.commit()
        db.refresh(contrato)
        return contrato
    except Exception as e:
        db.rollback()
        destino.unlink(missing_ok=True)
        print(f"No se ha podido guardar el documento del contrato ({id_contrato}): {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se ha podido guardar el documento del contrato.")

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
        selectinload(Contratos.centros_trabajo_relaciones).joinedload(ContratosCentrosTrabajo.centro_trabajo),
        joinedload(Contratos.trabajador),
        joinedload(Contratos.departamento),
        joinedload(Contratos.calendarios_laborales)
        .joinedload(ContratosCalendarios.calendario_laboral))
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
        selectinload(Contratos.centros_trabajo_relaciones).joinedload(ContratosCentrosTrabajo.centro_trabajo),
        joinedload(Contratos.trabajador),
        joinedload(Contratos.departamento),
        joinedload(Contratos.calendarios_laborales)
        .joinedload(ContratosCalendarios.calendario_laboral))
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
        selectinload(Contratos.centros_trabajo_relaciones).joinedload(ContratosCentrosTrabajo.centro_trabajo),
        joinedload(Contratos.trabajador),
        joinedload(Contratos.departamento),
        joinedload(Contratos.calendarios_laborales)
        .joinedload(ContratosCalendarios.calendario_laboral))
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

    centros_ids = set(payload.centros_trabajo_ids)
    centros = db.query(CentrosTrabajo).filter(
        CentrosTrabajo.id.in_(centros_ids),
        CentrosTrabajo.empresa_id == payload.empresa_id,
        CentrosTrabajo.activo.is_(True),
    ).all()
    if len(centros) != len(centros_ids):
        print(f"Uno o más centros de trabajo del contrato del trabajador ({payload.trabajador_id}) no existen, están inactivos o pertenecen a otra empresa.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uno o más centros de trabajo no están disponibles para esta empresa."
        )

    if trabajador.empresa_id != payload.empresa_id:
        print(f"El trabajador ({trabajador.id}) y el contrato laboral ({payload.empresa_id}) deben pertenecer a la misma empresa.")
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
        db.flush()
        db.add_all([
            ContratosCentrosTrabajo(
                empresa_id=payload.empresa_id,
                contrato_id=nuevo_contrato.id,
                centro_trabajo_id=centro.id,
            )
            for centro in centros
        ])
        db.commit()

        contrato_creado = (
            db.query(Contratos).options(
            joinedload(Contratos.empresa),
            selectinload(Contratos.centros_trabajo_relaciones).joinedload(ContratosCentrosTrabajo.centro_trabajo),
            joinedload(Contratos.trabajador),
            joinedload(Contratos.departamento),
            joinedload(Contratos.calendarios_laborales)
            .joinedload(ContratosCalendarios.calendario_laboral))
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
            selectinload(Contratos.centros_trabajo_relaciones).joinedload(ContratosCentrosTrabajo.centro_trabajo),
            joinedload(Contratos.trabajador),
            joinedload(Contratos.departamento),
            joinedload(Contratos.calendarios_laborales)
            .joinedload(ContratosCalendarios.calendario_laboral))
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

    centros_actualizados = None
    if "centros_trabajo_ids" in payload.model_fields_set:
        centros_ids = set(payload.centros_trabajo_ids or [])
        if not centros_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El contrato debe tener al menos un centro de trabajo asociado.",
            )
        centros_actualizados = db.query(CentrosTrabajo).filter(
            CentrosTrabajo.id.in_(centros_ids),
            CentrosTrabajo.empresa_id == contrato.empresa_id,
            CentrosTrabajo.activo.is_(True),
        ).all()
        if len(centros_actualizados) != len(centros_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uno o varios centros de trabajo no están disponibles para esta empresa.",
            )

    try:
        cambios = payload.model_dump(
            exclude_unset=True,
            exclude={"centros_trabajo_ids"},
        )
        for campo, valor in cambios.items():
            setattr(contrato, campo, valor)
        setattr(contrato, "updated_at", datetime.now())
        if centros_actualizados is not None:
            contrato.centros_trabajo_relaciones.clear()
            contrato.centros_trabajo_relaciones.extend(
                ContratosCentrosTrabajo(
                    empresa_id=contrato.empresa_id,
                    centro_trabajo=centro,
                )
                for centro in centros_actualizados
            )
        db.commit()

        contrato_actualizado = (
            db.query(Contratos).options(
            joinedload(Contratos.empresa),
            selectinload(Contratos.centros_trabajo_relaciones).joinedload(ContratosCentrosTrabajo.centro_trabajo),
            joinedload(Contratos.trabajador),
            joinedload(Contratos.departamento),
            joinedload(Contratos.calendarios_laborales)
            .joinedload(ContratosCalendarios.calendario_laboral))
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

