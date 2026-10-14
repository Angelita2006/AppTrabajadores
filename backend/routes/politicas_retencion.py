from typing import Optional
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
from models.politicas_retencion import PoliticasRetencion
from models.usuarios import Usuarios
from schemas.politicas_retencion import (
    PoliticaRetencionCreate,
    PoliticaRetencionResponse,
)

# APIRouter agrupa todos los endpoints relacionados con la gestión de políticas de retención bajo el prefijo "/api/politicas-retencion".
router = APIRouter(prefix="/api/politicas-retencion", tags=["Políticas de Retención"])
# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "/global",
    response_model=Optional[PoliticaRetencionResponse],
    summary="Obtener política global por defecto",
)
@limiter.limit("60/minute")
def obtener_politica_global_defecto(
    request: Request,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.POLITICAS_RETENCION])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/politicas-retencion/global**

    Recupera la directiva general del sistema bajo autenticación activa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de política global de retención desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    politica_global = (
        db.query(PoliticasRetencion)
        .options(
            joinedload(PoliticasRetencion.empresa),
        )
        .filter(PoliticasRetencion.empresa_id == None)
        .first()
    )

    if not politica_global:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se ha configurado ninguna política de retención global por defecto en el servidor."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=request.headers.get('Empresa-ID'),
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={'recurso': 'politicas_retencion', 'accion': 'obtener_global', 'entidad_id': str(politica_global.id), 'detalles': 'Se consultó la política de retención global por defecto'},
        trabajador_id=None,
    )
    db.commit()

    return politica_global

@router.get(
    "/empresa/{id_empresa}",
    response_model=PoliticaRetencionResponse,
    summary="Obtener política aplicable a empresa",
)
@limiter.limit("60/minute")
def obtener_politica_aplicable_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.POLITICAS_RETENCION])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/politicas-retencion/empresa/{id_empresa}**

    Busca la directiva de una empresa validando que el usuario tenga acceso a dicho tenant.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de política de retención para la empresa ({id_empresa}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    if request.headers.get("Empresa-ID") != str(id_empresa):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar la política de retención de esta empresa."
        )

    politica = (
        db.query(PoliticasRetencion)
        .options(
            joinedload(PoliticasRetencion.empresa),
        )
        .filter(PoliticasRetencion.empresa_id == id_empresa)
        .first()
    )

    if not politica:
        politica = (
            db.query(PoliticasRetencion)
            .options(
                joinedload(PoliticasRetencion.empresa),
            )
            .filter(PoliticasRetencion.empresa_id == None)
            .first()
        )

    if not politica:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se ha encontrado ninguna política aplicable (ni personalizada ni global) para esta empresa."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={'recurso': 'politicas_retencion', 'accion': 'obtener_por_empresa', 'entidad_id': str(politica.id), 'detalles': f'Se consultó la política de retención aplicable para la empresa {id_empresa}'},
        trabajador_id=None,
    )
    db.commit()

    return politica

@router.post(
    "",
    response_model=PoliticaRetencionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear política de retención",
)
@limiter.limit("15/minute")
def crear_politica_retencion(
    request: Request,
    obj_in: PoliticaRetencionCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.POLITICAS_RETENCION])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/politicas-retencion**

    Establece una nueva directiva de retención validando permisos de administrador y tenant.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de política de retención desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    if not obj_in.empresa_id or request.headers.get("Empresa-ID") != str(obj_in.empresa_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar políticas de retención globales o para otra empresa."
        )

    politica_global = db.query(PoliticasRetencion).filter(
        PoliticasRetencion.empresa_id.is_(None)
    ).first()
    if politica_global and obj_in.anios_conservacion < politica_global.anios_conservacion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La política de empresa no puede conservar menos tiempo que la política global.",
        )

    try:
        if obj_in.empresa_id:
            empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
            if not empresa:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Empresa no encontrada."
                )

            politica_existente = db.query(PoliticasRetencion).filter(
                PoliticasRetencion.empresa_id == obj_in.empresa_id
            ).first()

            if politica_existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Esta empresa ya cuenta con una política de retención personalizada registrada."
                )

        nueva_politica = PoliticasRetencion(
            anios_conservacion=obj_in.anios_conservacion,
            accion_tras_periodo=obj_in.accion_tras_periodo,
            empresa_id=obj_in.empresa_id
        )

        db.add(nueva_politica)

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=obj_in.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={'recurso': 'politicas_retencion', 'accion': 'crear_politica', 'entidad_id': str(nueva_politica.id), 'detalles': f'Se creó una nueva política de retención para la empresa {obj_in.empresa_id}'},
            trabajador_id=None,
        )

        db.commit()

        politica_creada = (
            db.query(PoliticasRetencion)
            .options(
                joinedload(PoliticasRetencion.empresa),
            )
            .filter(PoliticasRetencion.id == nueva_politica.id)
            .first()
        )

        return politica_creada

    except HTTPException as http_error:
        raise http_error
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar crear_politica_retencion: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido guardar la política de retención'       )

@router.put(
    "/{id_politica}",
    response_model=PoliticaRetencionResponse,
    summary="Actualizar años de retención",
)
@limiter.limit("15/minute")
def actualizar_anios_retencion(
    request: Request,
    id_politica: UUID,
    nuevos_anios: int,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.POLITICAS_RETENCION])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **PUT /api/politicas-retencion/{id_politica}?nuevos_anios=5**

    Modifica la cantidad de años vigilando el cumplimiento legal y la autorización del tenant.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de la política ({id_politica}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")
    # Validaciones estructurales básicas

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    politica = db.query(PoliticasRetencion).filter(PoliticasRetencion.id == id_politica).first()
    if not politica:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Política de retención no encontrada."
        )

    if request.headers.get("Empresa-ID") != str(politica.empresa_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar esta política de retención."
        )

    if nuevos_anios < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción denegada. La normativa vigente exige una conservación mínima de 4 años para los registros horarios."
        )

    if politica.empresa_id is not None:
        politica_global = db.query(PoliticasRetencion).filter(
            PoliticasRetencion.empresa_id.is_(None)
        ).first()
        if politica_global and nuevos_anios < politica_global.anios_conservacion:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La política de empresa no puede conservar menos tiempo que la política global.",
            )

    setattr(politica, "anios_conservacion", nuevos_anios)

    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=politica.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={'recurso': 'politicas_retencion', 'accion': 'actualizar_anios', 'entidad_id': str(id_politica), 'detalles': f'Se actualizaron los años de retención a {nuevos_anios} para la política {id_politica}'},
            trabajador_id=None,
        )

        db.commit()

        politica_actualizada = (
            db.query(PoliticasRetencion)
            .options(
                joinedload(PoliticasRetencion.empresa),
            )
            .filter(PoliticasRetencion.id == id_politica)
            .first()
        )

        return politica_actualizada
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar actualizar_anios_retencion: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido actualizar la política de retención'       )
