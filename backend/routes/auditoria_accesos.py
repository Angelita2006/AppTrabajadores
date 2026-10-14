from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session, joinedload

from core.enums import AccionPermisoEnum, TipoPermisoEnum
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from models.auditoria_accesos import AuditoriaAccesos
from models.empresas import Empresas
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from schemas.auditoria_accesos import AuditoriaAccesoResponse

# APIRouter agrupa todos los endpoints relacionados con la auditoría de accesos bajo el prefijo "/api/auditoria-accesos".
router = APIRouter(prefix="/api/auditoria-accesos", tags=["Auditoría de Accesos"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "/empresa/{id_empresa}",
    response_model=List[AuditoriaAccesoResponse],
    summary="Obtener auditoría por empresa",
    description="Obtiene el historial de accesos de auditoría de la empresa.",
)
def obtener_auditoria_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.AUDITORIA_ACCESOS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/auditoria-accesos/empresa/{id_empresa}**

    Obtiene el historial de accesos de auditoría de la empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de accesos de auditoría para la empresa ({id_empresa}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        print(f"Empresa ({id_empresa}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Empresa no encontrada.")

    accesos_auditoria = (
        db.query(AuditoriaAccesos)
        .options(joinedload(AuditoriaAccesos.empresa),joinedload(AuditoriaAccesos.usuario),joinedload(AuditoriaAccesos.trabajador))
        .filter(AuditoriaAccesos.empresa_id == id_empresa)
        .all()
    )

    return accesos_auditoria

@router.get(
    "/usuario/{id_usuario}",
    response_model=List[AuditoriaAccesoResponse],
    summary="Obtener auditoría por usuario",
    description="Obtiene el historial de accesos de auditoría del trabajador.",
)
def obtener_auditoria_usuario(
    request: Request,
    id_usuario: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.AUDITORIA_ACCESOS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/auditoria-accesos/trabajador/{id_trabajador}**

    Obtiene el historial de accesos de auditoría del trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de accesos de auditoría para el usuario ({id_usuario}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    usuario = db.query(Usuarios).filter(Usuarios.id == id_usuario).first()
    if not usuario:
        print(f"Usuario ({id_usuario}) no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Usuario no encontrado.")

    accesos_auditoria = (
        db.query(AuditoriaAccesos)
        .options(joinedload(AuditoriaAccesos.empresa), joinedload(AuditoriaAccesos.usuario), joinedload(AuditoriaAccesos.trabajador))
        .filter(AuditoriaAccesos.usuario_id == id_usuario)
        .all()
    )

    return accesos_auditoria


@router.get(
    "/trabajador/{id_trabajador}",
    response_model=List[AuditoriaAccesoResponse],
    summary="Obtener auditoría por trabajador",
    description="Obtiene el historial de accesos de auditoría del trabajador.",
)
def obtener_auditoria_por_trabajador(
    request: Request,
    id_trabajador: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.AUDITORIA_ACCESOS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/auditoria-accesos/trabajador/{id_trabajador}**

    Obtiene el historial de accesos de auditoría del trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de accesos de auditoría para el trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Trabajador no encontrado.")

    accesos_auditoria = (
        db.query(AuditoriaAccesos)
        .options(joinedload(AuditoriaAccesos.empresa), joinedload(AuditoriaAccesos.usuario), joinedload(AuditoriaAccesos.trabajador))
        .filter(AuditoriaAccesos.trabajador_id == id_trabajador)
        .all()
    )

    return accesos_auditoria
