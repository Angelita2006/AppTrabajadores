from typing import Optional
from fastapi import Request
from sqlalchemy.orm import Session
from core.enums import AccionAuditoriaEnum
from models.auditoria_accesos import AuditoriaAccesos
from models.usuarios import Usuarios

def registrar_auditoria(
    db: Session,
    request: Request,
    usuario: Usuarios,
    empresa_id,
    accion: AccionAuditoriaEnum,
    detalle: Optional[dict] = None,
    trabajador_id=None,
) -> None:
    """Añade un acceso auditable a la transacción actual."""
    db.add(AuditoriaAccesos(
        empresa_id=empresa_id,
        usuario_id=usuario.id,
        trabajador_id=trabajador_id,
        accion=accion,
        detalle=detalle or {},
        ip_address=request.client.host if request.client else None,
    ))