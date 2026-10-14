from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session, joinedload

from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum, AccionPermisoEnum, TipoPermisoEnum
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from core.utils import analizar_pdf_con_ia
from models.calendarios_laborales import CalendariosLaborales
from models.centros_trabajo import CentrosTrabajo
from models.empresas import Empresas
from models.festivos import Festivos
from models.usuarios import Usuarios
from schemas.calendarios_laborales import (
    CalendarioConFestivosResponse,
    CalendarioLaboralCreate,
    CalendarioLaboralResponse,
    CalendarioLaboralUpdate,
)

# APIRouter agrupa todos los endpoints relacionados con la gestión de calendarios laborales bajo el prefijo "/api/calendarios-laborales".
router = APIRouter(prefix="/api/calendarios-laborales", tags=["Calendarios Laborales"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.post(
    "/{id_calendario}/importar-pdf",
    summary="Importar festivos de calendario desde PDF",
    description="Extrae días festivos de un PDF y los incorpora al calendario laboral indicado.",
)
@limiter.limit("10/minute")
async def importar_calendario_pdf(
    request: Request,
    id_calendario: UUID,
    file: UploadFile = File(...),
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.IMPORTAR+"-"+TipoPermisoEnum.CALENDARIOS_LABORALES])),
    db: Session = Depends(get_db_with_advanced_security)):
    """
    **POST /api/calendarios-laborales/{calendario_id}/importar-pdf**

    Procesa un archivo PDF mediante IA para extraer e importar automáticamente los días festivos de un calendario laboral.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de importación de PDF para el calendario ({id_calendario}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == id_calendario).first()
    if not calendario:
        print(f"Calendario laboral ({id_calendario}) no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendario laboral no encontrado.")

    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo debe ser un formato PDF válido.")

    try:
        contenido_pdf = await file.read()

        # Extracción mediante Gemini
        festivos_detectados = analizar_pdf_con_ia(contenido_pdf)

        festivos_finales_retorno = []

        # Procesar cada festivo evitando violar la restricción unique de la Base de Datos
        for f in festivos_detectados:
            fecha_str = f["fecha"]

            # Verificar si ya existe un registro para ese calendario en esa misma fecha
            festivo_existente = db.query(Festivos).filter(
                Festivos.calendario_id == id_calendario,
                Festivos.fecha == fecha_str
            ).first()

            if festivo_existente:
                festivo_existente.descripcion = f["descripcion"] if f.get("descripcion") is not None else ""
                festivo_existente.tipo = f["tipo"]
                festivos_finales_retorno.append(festivo_existente)
            else:
                # Si no existe, crear el registro desde cero de forma segura
                nuevo_festivo = Festivos(
                    calendario_id=id_calendario,
                    fecha=fecha_str,
                    tipo=f["tipo"],
                    descripcion=f["descripcion"] if f.get("descripcion") is not None else ""
                )
                db.add(nuevo_festivo)
                festivos_finales_retorno.append(nuevo_festivo)

        # Guardar los cambios de forma segura en una sola transacción
        if festivos_finales_retorno:
            db.commit()
            # Refrescar las instancias para recuperar los IDs reales
            for f in festivos_finales_retorno:
                db.refresh(f)

            registrar_auditoria(
                db=db,
                request=request,
                usuario_id=usuario_actual.id,
                empresa_id=calendario.empresa_id,
                accion=AccionAuditoriaEnum.CREACION,
                detalle={"recurso": "calendarios_laborales", "accion": "importar_pdf"},
                trabajador_id=None
            )

        festivos = [
            {
                "id": f.id,
                "calendario_id": f.calendario_id,
                "fecha": f.fecha,
                "tipo": f.tipo,
                "descripcion": f.descripcion
            } for f in festivos_finales_retorno
        ]

        return {
            "total_importados": len(festivos_finales_retorno),
            "festivos": festivos,
            "detail": "Se han importado los festivos del PDF en el calendario seleccionado correctamente."
        }
    except Exception as e:
        db.rollback()  # Revierte cualquier cambio si ocurre un error imprevisto
        print(f"Error detallado en la persistencia del PDF para el calendario {id_calendario}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al procesar y guardar el PDF.")

@router.post(
    "",
    response_model=CalendarioLaboralResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear calendario laboral",
)
@limiter.limit("20/minute")
def crear_calendario_laboral(
    request: Request,
    payload: CalendarioLaboralCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR+"-"+TipoPermisoEnum.CALENDARIOS_LABORALES])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **POST /api/calendarios-laborales**

    Crea un nuevo calendario laboral anual asociándolo a una empresa o centro de trabajo.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de calendario laboral desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == payload.empresa_id).first()
    if not empresa:
        print(f"Empresa ({payload.empresa_id}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa no encontrada."
        )

    centro = db.query(CentrosTrabajo).filter(
        CentrosTrabajo.id == payload.centro_trabajo_id,
        CentrosTrabajo.activo.is_(True),
    ).first()

    if not centro:
        print(f"Centro de trabajo ({payload.centro_trabajo_id}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo no encontrado."
        )

    try:
        nuevo_calendario = CalendariosLaborales(
            empresa_id=payload.empresa_id,
            anio=payload.anio,
            nombre=payload.nombre,
            activo=payload.activo,
            centro_trabajo_id=payload.centro_trabajo_id
        )

        db.add(nuevo_calendario)
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=payload.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "calendarios_laborales", "accion": "crear"},
            trabajador_id=None
        )

        calendario_creado = (
            db.query(CalendariosLaborales)
            .options(joinedload(CalendariosLaborales.empresa), joinedload(CalendariosLaborales.centro_trabajo))
            .filter(CalendariosLaborales.id == nuevo_calendario.id)
            .first()
        )

        return calendario_creado
    except Exception as e:
        db.rollback()
        print(f"Ha ocurrido un error al crear el calendario laboral: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al crear el calendario laboral."
        )


@router.put(
    "/{id_calendario}",
    response_model=CalendarioLaboralResponse,
    summary="Modificar calendario laboral",
)
@limiter.limit("20/minute")
def modificar_calendario_laboral(
    request: Request,
    id_calendario: UUID,
    payload: CalendarioLaboralUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.CALENDARIOS_LABORALES])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/calendarios-laborales/{id_calendario}**

    Modifica los datos de un calendario existente.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de actualización del calendario laboral ({id_calendario}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == id_calendario).first()
    if not calendario:
        print(f"Calendario laboral ({id_calendario}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendario laboral ({id_calendario}) no encontrado."
        )

    try:
        if payload.nombre is not None:
            calendario.nombre = payload.nombre
        if payload.activo is not None:
            calendario.activo = payload.activo

        db.add(calendario)
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=calendario.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "calendarios_laborales", "accion": "modificar"},
            trabajador_id=None
        )

        calendario_actualizado = (
            db.query(CalendariosLaborales)
            .options(joinedload(CalendariosLaborales.empresa), joinedload(CalendariosLaborales.centro_trabajo))
            .filter(CalendariosLaborales.id == id_calendario)
            .first()
        )

        return calendario_actualizado
    except Exception as e:
        db.rollback()
        print(f"Error al actualizar el calendario laboral: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el calendario laboral."
        )

@router.put(
    "/{id_calendario}/desactivar",
    status_code=status.HTTP_200_OK,
    summary="Desactivar calendario laboral",
)
@limiter.limit("20/minute")
def desactivar_calendario_laboral(
    request: Request,
    id_calendario: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.CALENDARIOS_LABORALES])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/calendarios-laborales/{id_calendario}/desactivar**

    Desactiva un calendario.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de desactivación del calendario laboral ({id_calendario}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == id_calendario).first()
    if not calendario:
        print(f"Calendario laboral ({id_calendario}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendario laboral no encontrado."
        )

    calendario.activo = False
    calendario.updated_at = datetime.now()

    try:
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=calendario.empresa_id,
            accion=AccionAuditoriaEnum.ELIMINACION,
            detalle={"recurso": "calendarios_laborales", "accion": "desactivar"},
            trabajador_id=None
        )

        print(f"Calendario laboral ({id_calendario}) desactivado correctamente y enviado a la papelera.")
        return {"detail": f"Calendario laboral desactivado correctamente y enviado a la papelera."}
    except Exception as error:
        db.rollback()
        print(f"No se ha podido desactivar el calendario {id_calendario}: {str(error)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido desactivar el calendario."
        )

@router.get(
    "/empresa/{id_empresa}/con-festivos",
    response_model=List[CalendarioConFestivosResponse],
    summary="Obtener calendarios laborales con festivos por empresa",
)
@limiter.limit("60/minute")
def obtener_calendarios_laborales_festivos_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.CALENDARIOS_LABORALES])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/calendarios-laborales/empresa/{id_empresa}/con-festivos**

    Obtiene todos los calendarios laborales de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de calendarios laborales para la empresa ({id_empresa}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        print(f"Empresa ({id_empresa}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa no encontrada."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "calendarios_laborales", "accion": "consultar_con_festivos_empresa"},
        trabajador_id=None
    )

    calendarios = (
        db.query(CalendariosLaborales)
        .options(joinedload(CalendariosLaborales.empresa), joinedload(CalendariosLaborales.centro_trabajo))
        .filter(CalendariosLaborales.empresa_id == id_empresa, CalendariosLaborales.activo.is_(True))
        .all()
    )

    resultado = []
    for cal in calendarios:
        festivos_db = db.query(Festivos).filter(
            Festivos.calendario_id == cal.id,
            Festivos.activo.is_(True),
        ).order_by(Festivos.fecha.asc()).all()

        lista_festivos = []
        for f in festivos_db:
            lista_festivos.append(
                Festivos(
                    id=f.id,
                    fecha=f.fecha,
                    activo=f.activo,
                    descripcion=f.descripcion if f.descripcion is not None else "",
                    tipo=f.tipo
                )
            )

        resultado.append(
            CalendariosLaborales(
                id=cal.id,
                nombre=cal.nombre,
                anio=cal.anio,
                activo=cal.activo,
                centro_trabajo_id=cal.centro_trabajo_id,
                festivos=lista_festivos,
                empresa=cal.empresa,
                centro_trabajo=cal.centro_trabajo
            )
        )

    return resultado

@router.get(
    "/empresa/{id_empresa}",
    response_model=List[CalendarioLaboralResponse],
    summary="Obtener calendarios lalborales por empresa",
)
@limiter.limit("60/minute")
def obtener_calendarios_laborales_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.CALENDARIOS_LABORALES])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/calendarios-laborales/empresa/{id_empresa}**

    Obtiene los calendarios laborales de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de calendarios para la empresa ({id_empresa}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        print(f"Empresa ({id_empresa}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Empresa no encontrada.")

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "calendarios_laborales", "accion": "consultar_empresa"},
        trabajador_id=None
    )

    calendarios = (
        db.query(CalendariosLaborales)
        .options(joinedload(CalendariosLaborales.empresa), joinedload(CalendariosLaborales.centro_trabajo))
        .filter(CalendariosLaborales.empresa_id == id_empresa, CalendariosLaborales.activo.is_(True))
        .all()
    )

    return calendarios

@router.get(
    "/centro/{id_centro}",
    response_model=List[CalendarioLaboralResponse],
    summary="Obtener calendarios laborales por centro de trabajo",
)
@limiter.limit("60/minute")
def obtener_calendarios_laborales_centro(
    request: Request,
    id_centro: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.CALENDARIOS_LABORALES])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/calendarios-laborales/centro/{id_centro}**

    Recupera los calendarios asociados específicamente a una sede física concreta.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de calendarios para el centro de trabajo ({id_centro}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == id_centro).first()
    if not centro:
        print(f"Centro de trabajo {id_centro} no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro de trabajo no encontrado.")

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=centro.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "calendarios_laborales", "accion": "consultar_centro"},
        trabajador_id=None
    )

    calendarios = (
        db.query(CalendariosLaborales)
        .options(joinedload(CalendariosLaborales.empresa), joinedload(CalendariosLaborales.centro_trabajo))
        .filter(CalendariosLaborales.centro_trabajo_id == id_centro, CalendariosLaborales.activo.is_(True))
        .all()
    )

    return calendarios

@router.get(
    "/{id_calendario}",
    response_model=CalendarioConFestivosResponse,
    summary="Obtener calendario laboral por id",
)
@limiter.limit("60/minute")
def obtener_calendario_laboral_id(
    request: Request,
    id_calendario: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.CALENDARIOS_LABORALES])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/calendarios-laborales/{id_calendario}**

    Obtiene un calendario laboral con sus festivos por su id.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta del calendario ({id_calendario}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    calendario = (
        db.query(CalendariosLaborales)
        .options(joinedload(CalendariosLaborales.empresa), joinedload(CalendariosLaborales.centro_trabajo))
        .filter(CalendariosLaborales.id == id_calendario)
        .first()
    )
    if not calendario:
        print(f"Calendario laboral con festivos {id_calendario} no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendario laboral con festivos no encontrado."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=calendario.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "calendarios_laborales", "accion": "consultar_id"},
        trabajador_id=None
    )

    festivos_db = (
        db.query(Festivos)
        .filter(Festivos.calendario_id == calendario.id, Festivos.activo.is_(True))
        .order_by(Festivos.fecha.asc())
        .all()
    )

    lista_festivos = []
    for f in festivos_db:
        lista_festivos.append(
            Festivos(
                id=f.id,
                fecha=f.fecha,
                activo=f.activo,
                descripcion=f.descripcion if f.descripcion is not None else "",
                tipo=f.tipo
            )
        )

    calendario = CalendariosLaborales(
        id=calendario.id,
        nombre=calendario.nombre,
        activo=calendario.activo,
        anio=calendario.anio,
        centro_trabajo_id=calendario.centro_trabajo_id,
        festivos=lista_festivos,
        empresa=calendario.empresa,
        centro_trabajo=calendario.centro_trabajo
    )

    return calendario
