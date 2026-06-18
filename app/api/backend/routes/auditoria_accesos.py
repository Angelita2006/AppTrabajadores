from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from core.database import get_db
from empresas import Empresas
from schemas.auditoria_accesos import AuditoriaAccesoCreate, AuditoriaAccesoResponse
from trabajadores import Trabajadores
from usuarios import Usuarios
from auditoria_accesos import AuditoriaAccesos

router = APIRouter(prefix="/api/auditoria-accesos", tags=["Auditoría de Accesos"])

@router.post("", response_model=AuditoriaAccesoResponse, status_code=status.HTTP_201_CREATED)
def registrar_acceso_auditoria(obj_in: AuditoriaAccesoCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/auditoria-accesos
    Registra de forma inmutable una acción de consulta, descarga o exportación de datos horarios.
    """
    try:
        # 1. Validación de seguridad: Verifica que la empresa exista
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
            )

        # 2. Validación de seguridad: Si se asocia a un usuario, verifica que exista
        if obj_in.usuario_id:
            usuario = db.query(Usuarios).filter(Usuarios.id == obj_in.usuario_id).first()
            if not usuario:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Usuario ({obj_in.usuario_id}) no encontrado."
                )

        # 3. Validación de seguridad: Si se asocia a un trabajador, verifica que exista
        if obj_in.trabajador_id:
            trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
            if not trabajador:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Trabajador ({obj_in.trabajador_id}) no encontrado."
                )

        # 4. Mapea los datos del esquema directamente al modelo físico de SQLAlchemy
        nuevo_registro = AuditoriaAccesos(
            empresa_id=obj_in.empresa_id,
            accion=obj_in.accion,
            usuario_id=obj_in.usuario_id,
            trabajador_id=obj_in.trabajador_id,
            detalle=obj_in.detalle,
            # Se procesa la IP a través de los metadatos de red (INET en PostgreSQL)
            ip_address=str(obj_in.ip_address) if obj_in.ip_address else None
        )
        
        db.add(nuevo_registro)
        db.commit()
        db.refresh(nuevo_registro)
        return nuevo_registro

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al guardar el registro de auditoría: {str(error)}"
        )


@router.get("", response_model=List[AuditoriaAccesoResponse])
def obtener_toda_la_auditoria(db: Session = Depends(get_db)):
    """
    URI: GET /api/auditoria-accesos
    Devuelve la trazabilidad completa y absoluta de accesos del Saas para la gestoría.
    """
    return db.query(AuditoriaAccesos).all()


@router.get("/empresa/{id_empresa}", response_model=List[AuditoriaAccesoResponse])
def obtener_auditoria_empresa(id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/auditoria-accesos/empresa/{id_empresa}
    Recupera el historial de consultas de forma aislada para un cliente específico (tenant).
    """
    return db.query(AuditoriaAccesos).filter(AuditoriaAccesos.empresa_id == id_empresa).all()


@router.get("/trabajador/{id_trabajador}", response_model=List[AuditoriaAccesoResponse])
def obtener_auditoria_por_trabajador(id_trabajador: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/auditoria-accesos/trabajador/{id_trabajador}
    Filtra qué usuarios o inspectores han revisado el expediente de un operario concreto.
    """
    return db.query(AuditoriaAccesos).filter(AuditoriaAccesos.trabajador_id == id_trabajador).all()
