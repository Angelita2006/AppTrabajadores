from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import joinedload, Session

from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum, AccionPermisoEnum, TipoPermisoEnum
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from models.empresas import Empresas
from models.motivos_pausa import MotivosPausa
from models.usuarios import Usuarios
from schemas.motivos_pausa import MotivoPausaCreate, MotivoPausaResponse

# APIRouter agrupa todos los endpoints relacionados con la gestión de motivos de pausa bajo el prefijo "/api/motivos-pausa".
router = APIRouter(prefix="/api/motivos-pausa", tags=["Motivos de Pausa"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    '/empresa/{id_empresa}',
    response_model=List[MotivoPausaResponse],
    summary='Obtener motivos de pausa disponibles por empresa',
    description="Obtiene los motivos de descanso disponibles para una empresa: los comunes globales y los personalizados.",
)
@limiter.limit("60/minute")
def obtener_motivos_disponibles_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.MOTIVOS_PAUSA])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/motivos-pausa/empresa/{id_empresa}**

    Obtiene los motivos de descanso disponibles para una empresa: los comunes globales
    y los personalizados.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de motivos de pausa para la empresa ({id_empresa}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    if not usuario_actual.activo:
        print("La cuenta de usuario se encuentra inactiva.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    if request.headers.get("Empresa-ID") != str(id_empresa):
        print("No tienes permisos para ver los motivos de pausa de esta empresa.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver los motivos de pausa de esta empresa."
        )

    resultados = (
        db.query(MotivosPausa).options(
        joinedload(MotivosPausa.empresa))
        .filter((MotivosPausa.empresa_id == id_empresa) | (MotivosPausa.empresa_id == None))
        .order_by(MotivosPausa.nombre.asc())
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'motivos_pausa',
            'accion': 'consultar_empresa',
        },
        trabajador_id=None,
    )
    db.commit()

    return resultados

@router.get(
    '/{id_motivo}',
    response_model=MotivoPausaResponse,
    summary='Obtener motivo de pausa por id',
    description="Obtiene un motivo de pausa por su id.",
)
@limiter.limit("60/minute")
def obtener_motivo_pausa(
    request: Request,
    id_motivo: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.MOTIVOS_PAUSA])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/motivos-pausa/{id_motivo}**

    Obtiene un motivo de pausa por su id.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle del motivo de pausa ({id_motivo}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    if not usuario_actual.activo:
        print("La cuenta de usuario se encuentra inactiva.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    motivo = (
        db.query(MotivosPausa).options(
        joinedload(MotivosPausa.empresa))
        .filter(MotivosPausa.id == id_motivo)
        .first()
    )

    if not motivo:
        print(f"Motivo de pausa ({id_motivo}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Motivo de pausa no encontrado."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=motivo.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'motivos_pausa',
            'accion': 'consultar_id',
        },
        trabajador_id=None,
    )
    db.commit()

    return motivo

@router.post(
    '',
    response_model=MotivoPausaResponse,
    status_code=status.HTTP_201_CREATED,
    summary='Crear motivo de pausa',
    description="Registra una nueva tipología de descanso, ya sea global o específica de un tenant.",
)
@limiter.limit("15/minute")
def crear_motivo_pausa(
    request: Request,
    payload: MotivoPausaCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.MOTIVOS_PAUSA])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/motivos-pausa**

    Registra una nueva tipología de descanso, ya sea global o específica de un tenant.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de motivo de pausa desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    if not usuario_actual.activo:
        print("La cuenta de usuario se encuentra inactiva.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    try:
        if payload.empresa_id:
            empresa = db.query(Empresas).filter(Empresas.id == payload.empresa_id).first()
            if not empresa:
                print(f"Empresa ({payload.empresa_id}) no encontrada.")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Empresa no encontrada."
                )

        nuevo_motivo = MotivosPausa(
            nombre=payload.nombre,
            computa_como_trabajo=payload.computa_como_trabajo,
            empresa_id=payload.empresa_id,
            duracion_max_minutos=payload.duracion_max_minutos
        )

        db.add(nuevo_motivo)

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=payload.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': 'motivos_pausa',
                'accion': 'crear',
            },
            trabajador_id=None,
        )

        db.commit()

        motivo_creado = (
            db.query(MotivosPausa).options(
            joinedload(MotivosPausa.empresa))
            .filter(MotivosPausa.id == nuevo_motivo.id)
            .first()
        )

        return motivo_creado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear el motivo de pausa: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido crear el motivo de pausa.'
        )
