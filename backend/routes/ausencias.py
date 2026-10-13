import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.ausencias import Ausencias
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from core.enums import AccionAuditoriaEnum, AccionPermisoEnum, TipoPermisoEnum
from models.empresas import Empresas
from core.enums import EstadoAusenciaEnum
from schemas.ausencias import AusenciaCreate, AusenciaResponse, AusenciaUpdate
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from core.auditoria import registrar_auditoria

# APIRouter agrupa todos los endpoints relacionados con el control de ausencias y bajas bajo el prefijo "/api/ausencias".
router = APIRouter(prefix="/api/ausencias", tags=["Control de Ausencias y Bajas"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=AusenciaResponse, status_code=status.HTTP_201_CREATED, summary="Crear ausencia")
@limiter.limit("20/minute") 
def crear_ausencia(
    request: Request,
    payload: AusenciaCreate, 
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR+"-"+TipoPermisoEnum.AUSENCIAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **POST /api/ausencias**
    
    Crea una nueva ausencia (vacaciones, baja, etc.) en estado 'pendiente' por defecto.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de ausencia para el trabajador ({payload.trabajador_id}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    if usuario_actual.empresa_id != payload.empresa_id:
        print(f"Acceso denegado: El usuario {usuario_actual.email} intentó registrar ausencia en otra empresa.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar ausencias en esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == payload.empresa_id).first()
    if not empresa:
        print(f"Empresa ({payload.empresa_id}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Empresa no encontrada.")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == payload.trabajador_id).first()
    if not trabajador:
        print(f"Trabajador ({payload.trabajador_id}) no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Trabajador no encontrado.")

    nueva_ausencia = Ausencias(
        empresa_id=payload.empresa_id,
        trabajador_id=payload.trabajador_id,
        tipo_ausencia=payload.tipo_ausencia,
        estado=EstadoAusenciaEnum.PENDIENTE,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
        motivo=payload.motivo,
        justificante_url=payload.justificante_url
    )

    try:
        db.add(nueva_ausencia)
        db.commit()
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=empresa.id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "ausencias", "accion": "crear"},
            trabajador_id=trabajador.id
        )
        
        ausencia_creada = (
            db.query(Ausencias)
            .options(joinedload(Ausencias.empresa), joinedload(Ausencias.trabajador), joinedload(Ausencias.usuario_validador))
            .filter(Ausencias.id == nueva_ausencia.id)
            .first()
        )
        
        print(f"Ausencia creada con éxito ({nueva_ausencia.id}).")
        return ausencia_creada
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear la ausencia: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido crear la ausencia."
        )

@router.put("/{id_ausencia}/resolver", response_model=AusenciaResponse, summary="Resolver solicitud de ausencia")
@limiter.limit("20/minute")  
def resolver_solicitud_ausencia(
    request: Request,
    id_ausencia: UUID, 
    payload: AusenciaUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.AUDITORIA_ACCESOS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/ausencias/{id_ausencia}/resolver**
    
    Tramita la resolución (aprobación/rechazo) de una ausencia.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de resolución para la ausencia ({id_ausencia}) con estado '{payload.estado}' desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    ausencia = db.query(Ausencias).filter(Ausencias.id == id_ausencia).first()
    if not ausencia:
        print(f"Ausencia ({id_ausencia}) no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ausencia no encontrada.")

    if usuario_actual.empresa_id != ausencia.empresa_id:
        print(f"Acceso denegado: Intento de resolución sobre ausencia de otra empresa por {usuario_actual.email}.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para resolver esta solicitud de ausencia."
        )

    # Impide modificar una solicitud que ya fue procesada previamente
    if ausencia.estado != EstadoAusenciaEnum.PENDIENTE:
        print(f"Intento de resolver una ausencia ya procesada ({id_ausencia}, Estado actual: {ausencia.estado}).")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta solicitud ya ha sido resuelta previamente.")

    resolutor = db.query(Usuarios).filter(Usuarios.id == payload.usuario_validador_id).first()
    if not resolutor:
        print(f"Usuario validador con ID {payload.usuario_validador_id} no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario validador no encontrado.")

    if payload.estado == EstadoAusenciaEnum.PENDIENTE:
        print("Intento inválido de cambiar el estado a pendiente durante la resolución.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede devolver una solicitud al estado pendiente.")

    # Inyección de los parámetros de resolución 
    setattr(ausencia, "estado", payload.estado)
    setattr(ausencia, "usuario_validador_id", payload.usuario_validador_id)
    setattr(ausencia, "observaciones_admin", payload.observaciones_admin)
    setattr(ausencia, "fecha_resolucion", datetime.datetime.now())
    setattr(ausencia, "updated_at", datetime.datetime.now())

    db.commit()
    
    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=ausencia.empresa_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={"recurso": "ausencias", "accion": "resolver"},
        trabajador_id=ausencia.trabajador_id
    )
    
    ausencia_resuelta = (
        db.query(Ausencias)
        .options(joinedload(Ausencias.empresa), joinedload(Ausencias.trabajador), joinedload(Ausencias.usuario_validador))
        .filter(Ausencias.id == id_ausencia)
        .first()
    )
    
    print(f"Ausencia ({id_ausencia}) resuelta exitosamente con estado '{payload.estado}'.")
    return ausencia_resuelta

@router.get("/empresa/{id_empresa}", response_model=List[AusenciaResponse], summary="Obtener ausencias por empresa")
def obtener_ausencias_empresa(
    request: Request,
    id_empresa: UUID, 
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.AUSENCIAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/ausencias/empresa/{id_empresa}**
    
    Obtiene las ausencias de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de ausencias para la empresa ({id_empresa}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    if usuario_actual.empresa_id != id_empresa:
        print(f"Acceso denegado: {usuario_actual.email} intentó consultar ausencias de otra empresa.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar las ausencias de esta empresa."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "ausencias", "accion": "consultar_empresa"},
        trabajador_id=None
    )

    ausencias = (
        db.query(Ausencias)
        .options(joinedload(Ausencias.empresa), joinedload(Ausencias.trabajador), joinedload(Ausencias.usuario_validador))
        .filter(Ausencias.empresa_id == id_empresa)
        .all()
    )

    return ausencias

@router.get("/trabajador/{id_trabajador}", response_model=List[AusenciaResponse], summary="Obtener ausencias por trabajador")
def obtener_ausencias_trabajador(
    request: Request,
    id_trabajador: UUID, 
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.AUSENCIAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/ausencias/trabajador/{id_trabajador}**
    
    Obtiene las ausencias de un trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de ausencias para el trabajador ({id_trabajador}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador ({id_trabajador}) no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    if usuario_actual.empresa_id != trabajador.empresa_id:
        print(f"Acceso denegado: {usuario_actual.email} intentó consultar ausencias de un trabajador externo.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para consultar las ausencias de este trabajador."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "ausencias", "accion": "consultar_trabajador"},
        trabajador_id=id_trabajador
    )

    ausencias = (
        db.query(Ausencias)
        .options(joinedload(Ausencias.empresa), joinedload(Ausencias.trabajador), joinedload(Ausencias.usuario_validador))
        .filter(Ausencias.trabajador_id == id_trabajador)
        .all()
    )

    return ausencias