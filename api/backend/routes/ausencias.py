import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.ausencias import Ausencias
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from core.enums import EstadoAusenciaEnum
from schemas.ausencias import AusenciaCreate, AusenciaResponse
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios

# APIRouter agrupa todos los endpoints relacionados con el control de ausencias y bajas bajo el prefijo "/api/ausencias".
router = APIRouter(prefix="/api/ausencias", tags=["Control de Ausencias y Bajas"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=AusenciaResponse, status_code=status.HTTP_201_CREATED, summary="Solicitar ausencia")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def solicitar_ausencia(
    request: Request,
    obj_in: AusenciaCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **POST /api/ausencias**
    
    Registra una nueva solicitud de ausencia (vacaciones, baja, etc.) en estado 'pendiente' por defecto.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de ausencia para el trabajador ID {obj_in.trabajador_id} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    # Validar permisos de tenant / empresa
    if usuario_actual.empresa_id and usuario_actual.empresa_id != obj_in.empresa_id:
        print(f"Acceso denegado: El usuario {usuario_actual.email} intentó registrar ausencia en otra empresa.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar ausencias en esta empresa."
        )

    # 1. Validaciones estructurales de aislamiento de datos (Tenant)
    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        print(f"Empresa con ID {obj_in.empresa_id} no encontrada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada.")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        print(f"Trabajador con ID {obj_in.trabajador_id} no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    # 2. Creación del registro físico en la base de datos
    nueva_ausencia = Ausencias(
        empresa_id=obj_in.empresa_id,
        trabajador_id=obj_in.trabajador_id,
        tipo_ausencia=obj_in.tipo_ausencia,
        fecha_inicio=obj_in.fecha_inicio,
        fecha_fin=obj_in.fecha_fin,
        motivo=obj_in.motivo,
        justificante_metadata=obj_in.justificante_metadata,
        estado=EstadoAusenciaEnum.PENDIENTE
    )

    try:
        db.add(nueva_ausencia)
        db.commit()
        
        ausencia_creada = (
            db.query(Ausencias)
            .options(
                joinedload(Ausencias.empresa),
                joinedload(Ausencias.trabajador),
                joinedload(Ausencias.validado_por_usuario)
            )
            .filter(Ausencias.id == nueva_ausencia.id)
            .first()
        )
        
        print(f"Ausencia registrada con éxito con ID: {nueva_ausencia.id}")
        return ausencia_creada
    except Exception as error:
        db.rollback()
        print(f"Error de integridad al registrar ausencia: {str(error)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error de integridad al procesar la solicitud: {str(error)}"
        )


@router.put("/{id_ausencia}/estado", response_model=AusenciaResponse, summary="Actualizar estado de ausencia")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def actualizar_estado_ausencia(
    request: Request,
    id_ausencia: UUID, 
    nuevo_estado: str,  
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **PUT /api/ausencias/{id_ausencia}/estado?nuevo_estado=aprobado**
    
    Modifica el estado de una solicitud de ausencia (aprobar o rechazar).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de actualización de estado para ausencia {id_ausencia} a '{nuevo_estado}' desde la IP: {cliente_ip} por: {usuario_actual.email}")

    # 1. Buscar la ausencia por su ID único
    ausencia = db.query(Ausencias).filter(Ausencias.id == id_ausencia).first()
    
    if not ausencia:
        print(f"Ausencia con ID {id_ausencia} no localizada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ninguna solicitud de ausencia con el ID {id_ausencia}."
        )

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == ausencia.trabajador_id).first()
    if usuario_actual.empresa_id and trabajador and usuario_actual.empresa_id != trabajador.empresa_id:
        print(f"Acceso denegado: El usuario {usuario_actual.email} intentó modificar ausencia de otra empresa.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar el estado de esta ausencia."
        )

    # 2. Actualizar el campo de estado de forma dinámica
    setattr(ausencia, "estado", nuevo_estado)
    
    try:
        db.commit()
        
        ausencia_actualizada = (
            db.query(Ausencias)
            .options(
                joinedload(Ausencias.empresa),
                joinedload(Ausencias.trabajador),
                joinedload(Ausencias.validado_por_usuario)
            )
            .filter(Ausencias.id == id_ausencia)
            .first()
        )
        
        print(f"Estado de la ausencia {id_ausencia} actualizado exitosamente a '{nuevo_estado}'.")
        return ausencia_actualizada
    except Exception as error:
        db.rollback()
        print(f"Error al actualizar el estado de la ausencia {id_ausencia}: {str(error)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el estado de la ausencia: {str(error)}"
        )


@router.put("/{id_ausencia}/resolver", response_model=AusenciaResponse, summary="Resolver solicitud de ausencia")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def resolver_solicitud_ausencia(
    request: Request,
    id_ausencia: UUID, 
    nuevo_estado: EstadoAusenciaEnum, 
    resolutor_usuario_id: UUID, 
    observaciones: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **PUT /api/ausencias/{id_ausencia}/resolver?nuevo_estado=aprobada&resolutor_usuario_id=UUID**
    
    Tramita la resolución (aprobación/rechazo) de un periodo de ausencia por parte de administración.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de resolución para la ausencia {id_ausencia} con estado '{nuevo_estado}' desde la IP: {cliente_ip} por: {usuario_actual.email}")

    ausencia = db.query(Ausencias).filter(Ausencias.id == id_ausencia).first()
    if not ausencia:
        print(f"Solicitud de ausencia con ID {id_ausencia} no localizada.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud de ausencia no localizada.")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == ausencia.trabajador_id).first()
    if usuario_actual.empresa_id and trabajador and usuario_actual.empresa_id != trabajador.empresa_id:
        print(f"Acceso denegado: Intento de resolución sobre ausencia de otra empresa por {usuario_actual.email}.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para resolver esta solicitud de ausencia."
        )

    # Impide modificar una solicitud que ya fue procesada previamente
    if ausencia.estado != EstadoAusenciaEnum.PENDIENTE:
        print(f"Intento de resolver una ausencia ya procesada (ID: {id_ausencia}, Estado actual: {ausencia.estado}).")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta solicitud ya ha sido resuelta previamente.")

    resolutor = db.query(Usuarios).filter(Usuarios.id == resolutor_usuario_id).first()
    if not resolutor:
        print(f"Usuario validador con ID {resolutor_usuario_id} no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario validador no encontrado.")

    if nuevo_estado == EstadoAusenciaEnum.PENDIENTE:
        print("Intento inválido de cambiar el estado a pendiente durante la resolución.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede devolver una solicitud al estado pendiente.")

    # Inyección segura de los parámetros de resolución mediante setattr para silenciar a Pylance
    setattr(ausencia, "estado", nuevo_estado)
    setattr(ausencia, "validado_por_usuario_id", resolutor_usuario_id)
    setattr(ausencia, "observaciones_admin", observaciones)
    setattr(ausencia, "fecha_resolucion", datetime.datetime.now())
    setattr(ausencia, "updated_at", datetime.datetime.now())

    db.commit()
    
    ausencia_resuelta = (
        db.query(Ausencias)
        .options(
            joinedload(Ausencias.empresa),
            joinedload(Ausencias.trabajador),
            joinedload(Ausencias.validado_por_usuario)
        )
        .filter(Ausencias.id == id_ausencia)
        .first()
    )
    
    print(f"Ausencia {id_ausencia} resuelta exitosamente con estado '{nuevo_estado}'.")
    return ausencia_resuelta


@router.get("/empresa/{id_empresa}", response_model=List[AusenciaResponse], summary="Obtener ausencias por empresa")
def obtener_ausencias_por_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/ausencias/empresa/{id_empresa}**
    
    Filtra las solicitudes dentro de una empresa cliente para el panel de recursos humanos.
    """
    print(f"Consulta de ausencias para la empresa ID {id_empresa} solicitada por: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        print(f"Acceso denegado: {usuario_actual.email} intentó consultar ausencias de otra empresa.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar las ausencias de esta empresa."
        )

    return (
        db.query(Ausencias)
        .options(
            joinedload(Ausencias.empresa),
            joinedload(Ausencias.trabajador),
            joinedload(Ausencias.validado_por_usuario)
        )
        .filter(Ausencias.empresa_id == id_empresa)
        .all()
    )


@router.get("/trabajador/{id_trabajador}", response_model=List[AusenciaResponse], summary="Obtener ausencias por trabajador")
def obtener_ausencias_por_trabajador(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/ausencias/trabajador/{id_trabajador}**
    
    Permite al operario consultar el estado de sus bajas o vacaciones desde la app móvil.
    """
    print(f"Consulta de ausencias para el trabajador ID {id_trabajador} solicitada por: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        print(f"Trabajador con ID {id_trabajador} no encontrado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != trabajador.empresa_id:
        if getattr(usuario_actual, "trabajador_id", None) != id_trabajador:
            print(f"Acceso denegado: {usuario_actual.email} intentó consultar ausencias de un trabajador externo.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para consultar las ausencias de este trabajador."
            )

    return (
        db.query(Ausencias)
        .options(
            joinedload(Ausencias.empresa),
            joinedload(Ausencias.trabajador),
            joinedload(Ausencias.validado_por_usuario)
        )
        .filter(Ausencias.trabajador_id == id_trabajador)
        .all()
    )