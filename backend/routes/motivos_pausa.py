from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from models.motivos_pausa import MotivosPausa
from models.usuarios import Usuarios
from schemas.motivos_pausa import MotivoPausaCreate, MotivoPausaResponse
from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum

# Configuración del enrutador para la gestión de motivos de pausa y descanso laboral
router = APIRouter(prefix="/api/motivos-pausa", tags=["Motivos de Pausa"])

# Configuración del limitador de tasa de peticiones por IP para prevenir abusos y ataques de denegación
limiter = Limiter(key_func=get_remote_address)


@router.get("/empresa/{id_empresa}", response_model=List[MotivoPausaResponse], summary="Obtener motivos de pausa disponibles por empresa")
@limiter.limit("60/minute")
def obtener_motivos_disponibles_empresa(
    request: Request,
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **GET /api/motivos-pausa/empresa/{id_empresa}**
    
    Recupera los motivos de descanso utilizables por una empresa: los comunes globales (NULL) 
    y los personalizados propios de esta organización.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de motivos de pausa para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    if usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver los motivos de pausa de esta empresa."
        )

    resultados = db.query(MotivosPausa).options(
        joinedload(MotivosPausa.empresa)
    ).filter(
        (MotivosPausa.empresa_id == id_empresa) | (MotivosPausa.empresa_id == None)
    ).order_by(MotivosPausa.nombre.asc()).all()

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "motivos_pausa", "accion": "consultar_por_empresa", "entidad_id": str(id_empresa), "detalles": f"Se consultaron los motivos de pausa disponibles para la empresa {id_empresa}"}
    )
    db.commit()

    return resultados


@router.get("/{id_motivo}", response_model=MotivoPausaResponse, summary="Obtener motivo de pausa por ID")
@limiter.limit("60/minute") 
def obtener_motivo_pausa(
    request: Request,
    id_motivo: int, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **GET /api/motivos-pausa/{id_motivo}**
    
    Busca un motivo de pausa específico mediante su identificador numérico (SmallInteger).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle del motivo de pausa {id_motivo} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    motivo = db.query(MotivosPausa).options(
        joinedload(MotivosPausa.empresa)
    ).filter(MotivosPausa.id == id_motivo).first()
    
    if not motivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Motivo de pausa con ID {id_motivo} no encontrado."
        )
    
    if motivo.empresa_id is not None and motivo.empresa_id != usuario_actual.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder a este motivo de pausa."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=motivo.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "motivos_pausa", "accion": "consultar_por_id", "entidad_id": str(id_motivo), "detalles": f"Se consultó el detalle del motivo de pausa {id_motivo}"}
    )
    db.commit()

    return motivo


@router.post("", response_model=MotivoPausaResponse, status_code=status.HTTP_201_CREATED, summary="Crear motivo de pausa")
@limiter.limit("15/minute") 
def crear_motivo_pausa(
    request: Request,
    obj_in: MotivoPausaCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **POST /api/motivos-pausa**
    
    Registra una nueva tipología de descanso, ya sea global o específica de un tenant.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de motivo de pausa desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    try:
        if obj_in.empresa_id:
            empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
            if not empresa:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
                )

        if not obj_in.empresa_id or usuario_actual.empresa_id != obj_in.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para crear motivos de pausa globales o para otra empresa."
            )

        nuevo_motivo = MotivosPausa(
            nombre=obj_in.nombre,
            computa_como_trabajo=obj_in.computa_como_trabajo,
            empresa_id=obj_in.empresa_id,
            duracion_max_minutos=obj_in.duracion_max_minutos
        )
        
        db.add(nuevo_motivo)
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=obj_in.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "motivos_pausa", "accion": "crear_motivo_pausa", "entidad_id": str(nuevo_motivo.id), "detalles": f"Se ha registrado un nuevo motivo de pausa para la empresa {obj_in.empresa_id}"}
        )

        db.commit()
        
        motivo_creado = db.query(MotivosPausa).options(
            joinedload(MotivosPausa.empresa)
        ).filter(MotivosPausa.id == nuevo_motivo.id).first()
        
        return motivo_creado

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido crear el motivo de pausa: {str(error)}"
        )