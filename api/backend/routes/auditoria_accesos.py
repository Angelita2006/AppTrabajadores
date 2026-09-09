from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from schemas.auditoria_accesos import AuditoriaAccesoCreate, AuditoriaAccesoResponse
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from models.auditoria_accesos import AuditoriaAccesos

# APIRouter agrupa todos los endpoints relacionados con la auditoría de accesos bajo el prefijo "/api/auditoria-accesos".
router = APIRouter(prefix="/api/auditoria-accesos", tags=["Auditoría de Accesos"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=AuditoriaAccesoResponse, status_code=status.HTTP_201_CREATED, summary="Registrar acceso de auditoría")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def registrar_acceso_auditoria(
    request: Request,
    obj_in: AuditoriaAccesoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **POST /api/auditoria-accesos**
    
    Registra de forma inmutable una acción de consulta, descarga o exportación de datos horarios.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de auditoría para la empresa ID {obj_in.empresa_id} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    # Validar permisos de empresa si no pertenece a la misma empresa
    if usuario_actual.empresa_id and usuario_actual.empresa_id != obj_in.empresa_id:
        print(f"Acceso denegado: El usuario {usuario_actual.email} intentó registrar auditoría en otra empresa.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar auditorías en esta empresa."
        )

    try:
        # 1. Validación de seguridad: Verifica que la empresa exista
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            print(f"Empresa con ID {obj_in.empresa_id} no encontrada.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
            )

        # 2. Validación de seguridad: Si se asocia a un usuario, verifica que exista
        if obj_in.usuario_id:
            usuario = db.query(Usuarios).filter(Usuarios.id == obj_in.usuario_id).first()
            if not usuario:
                print(f"Usuario con ID {obj_in.usuario_id} no encontrado.")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Usuario ({obj_in.usuario_id}) no encontrado."
                )

        # 3. Validación de seguridad: Si se asocia a un trabajador, verifica que exista
        if obj_in.trabajador_id:
            trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
            if not trabajador:
                print(f"Trabajador con ID {obj_in.trabajador_id} no encontrado.")
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
        
        registro_creado = (
            db.query(AuditoriaAccesos)
            .options(
                joinedload(AuditoriaAccesos.empresa),
                joinedload(AuditoriaAccesos.usuario),
                joinedload(AuditoriaAccesos.trabajador)
            )
            .filter(AuditoriaAccesos.id == nuevo_registro.id)
            .first()
        )
        
        print(f"Registro de auditoría guardado con éxito con ID: {nuevo_registro.id}")
        return registro_creado

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        print(f"Error al guardar el registro de auditoría: {str(error)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al guardar el registro de auditoría: {str(error)}"
        )

@router.get("/empresa/{id_empresa}", response_model=List[AuditoriaAccesoResponse], summary="Obtener auditoría por empresa")
def obtener_auditoria_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/auditoria-accesos/empresa/{id_empresa}**
    
    Recupera el historial de consultas de forma aislada para un cliente específico (tenant).
    """
    print(f"Consulta de auditoría para la empresa ID {id_empresa} solicitada por: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        print(f"Acceso denegado: {usuario_actual.email} intentó consultar auditoría de otra empresa.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar la auditoría de esta empresa."
        )

    return (
        db.query(AuditoriaAccesos)
        .options(
            joinedload(AuditoriaAccesos.empresa),
            joinedload(AuditoriaAccesos.usuario),
            joinedload(AuditoriaAccesos.trabajador)
        )
        .filter(AuditoriaAccesos.empresa_id == id_empresa)
        .all()
    )


@router.get("/trabajador/{id_trabajador}", response_model=List[AuditoriaAccesoResponse], summary="Obtener auditoría por trabajador")
def obtener_auditoria_por_trabajador(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/auditoria-accesos/trabajador/{id_trabajador}**
    
    Filtra qué usuarios o inspectores han revisado el expediente de un operario concreto.
    """
    print(f"Consulta de auditoría para el trabajador ID {id_trabajador} solicitada por: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador con ID {id_trabajador} no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != trabajador.empresa_id:
        if getattr(usuario_actual, "trabajador_id", None) != id_trabajador:
            print(f"Acceso denegado: {usuario_actual.email} intentó ver auditoría de un trabajador externo.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para ver la auditoría de este trabajador."
            )

    return (
        db.query(AuditoriaAccesos)
        .options(
            joinedload(AuditoriaAccesos.empresa),
            joinedload(AuditoriaAccesos.usuario),
            joinedload(AuditoriaAccesos.trabajador)
        )
        .filter(AuditoriaAccesos.trabajador_id == id_trabajador)
        .all()
    )