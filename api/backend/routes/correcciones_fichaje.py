from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from typing import List, Any
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.utils import calcular_hash_fichaje
from models.centros_trabajo import CentrosTrabajo
from models.correcciones_fichaje import CorreccionesFichaje
from models.contratos import Contratos
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum, TipoFichajeEnum, EstadoCorreccionEnum, EstadoFichajeEnum, MetodoFichajeEnum, OrigenFichajeEnum, TipoCorreccionEnum
from models.empresas import Empresas
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from models.fichajes import Fichajes
from schemas.correcciones_fichaje import CorreccionFichajeCreate, CorreccionFichajeResponse

# APIRouter agrupa todos los endpoints relacionados con la gestión de correcciones de fichaje bajo el prefijo "/api/correcciones".
router = APIRouter(prefix="/api/correcciones", tags=["Correcciones de Fichaje"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
# Esto previene ataques de fuerza bruta o saturación de peticiones en rutas críticas.
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=CorreccionFichajeResponse, status_code=status.HTTP_201_CREATED, summary="Solicitar corrección")
@limiter.limit("20/minute")  # Protegido frente a peticiones masivas o automatizadas
def solicitar_correccion(
    request: Request,
    obj_in: CorreccionFichajeCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **POST /api/correcciones**
    
    Crea una nueva solicitud de rectificación horaria en estado 'pendiente' por defecto.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de solicitud de corrección desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para solicitar correcciones en esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Empresa con ID ({obj_in.empresa_id}) no encontrada."
        )

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Trabajador con ID ({obj_in.trabajador_id}) no encontrado."
        )

    usuario = db.query(Usuarios).filter(Usuarios.id == obj_in.solicitado_por_usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Usuario solicitante con ID ({obj_in.solicitado_por_usuario_id}) no encontrado."
        )

    if obj_in.fichaje_afectado_id:
        fichaje = db.query(Fichajes).filter(Fichajes.id == obj_in.fichaje_afectado_id).first()
        if not fichaje:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Fichaje afectado con ID ({obj_in.fichaje_afectado_id}) no encontrado."
            )

    nueva_correccion = CorreccionesFichaje(
        empresa_id=obj_in.empresa_id,
        trabajador_id=obj_in.trabajador_id,
        tipo_correccion=obj_in.tipo_correccion,
        tipo_evento_id=obj_in.tipo_evento_id,
        valor_nuevo=obj_in.valor_nuevo,
        motivo=obj_in.motivo,
        solicitado_por_usuario_id=obj_in.solicitado_por_usuario_id,
        fichaje_afectado_id=obj_in.fichaje_afectado_id,
        valor_anterior=obj_in.valor_anterior,
        estado=EstadoCorreccionEnum.PENDIENTE
    )

    try:
        db.add(nueva_correccion)
        db.commit()
        
        correccion_creada = db.query(CorreccionesFichaje).options(
            joinedload(CorreccionesFichaje.empresa),
            joinedload(CorreccionesFichaje.trabajador),
            joinedload(CorreccionesFichaje.solicitado_por_usuario),
            joinedload(CorreccionesFichaje.aprobado_por_usuario)
        ).filter(CorreccionesFichaje.id == nueva_correccion.id).first()
        
        return correccion_creada
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al registrar la solicitud de corrección: {str(error)}"
        )


@router.put("/{id_correccion}/resolver", response_model=CorreccionFichajeResponse, summary="Resolver incidencia de corrección")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def resolver_incidencia(
    request: Request,
    id_correccion: UUID, 
    nuevo_estado: EstadoCorreccionEnum, 
    resolutor_usuario_id: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/correcciones/{id_correccion}/resolver**
    
    Permite aprobar o rechazar una solicitud de corrección pendiente, aplicando los cambios necesarios en los fichajes.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de resolución de incidencia {id_correccion} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    incidencia = db.query(CorreccionesFichaje).options(
        joinedload(CorreccionesFichaje.empresa),
        joinedload(CorreccionesFichaje.trabajador),
        joinedload(CorreccionesFichaje.solicitado_por_usuario),
        joinedload(CorreccionesFichaje.aprobado_por_usuario)
    ).filter(CorreccionesFichaje.id == id_correccion).first()
    
    if not incidencia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Solicitud de corrección con ID ({id_correccion}) no encontrada."
        )
    
    if usuario_actual.empresa_id and usuario_actual.empresa_id != incidencia.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para resolver incidencias en esta empresa."
        )

    if incidencia.estado != EstadoCorreccionEnum.PENDIENTE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Acción bloqueada: Esta incidencia ya fue resuelta previamente."
        )

    try:
        incidencia.estado = nuevo_estado
        incidencia.aprobado_por_usuario_id = resolutor_usuario_id  
        incidencia.fecha_resolucion = datetime.now()

        if nuevo_estado == EstadoCorreccionEnum.APROBADA:
            fichaje_original = db.query(Fichajes).filter(Fichajes.id == incidencia.fichaje_afectado_id).first()
            
            if incidencia.tipo_correccion in [TipoCorreccionEnum.ANULACION, TipoCorreccionEnum.MODIFICACION]:
                if fichaje_original:
                    fichaje_original.estado = EstadoFichajeEnum.PENDIENTE_REVISION
                    fichaje_original.hash_integridad = calcular_hash_fichaje(
                        trabajador_id=str(fichaje_original.trabajador_id),
                        empresa_id=str(fichaje_original.empresa_id),
                        tipo_evento_id=str(fichaje_original.tipo_evento_id),
                        fecha_iso=fichaje_original.fecha_hora.isoformat()
                    )
            
            if incidencia.tipo_correccion in [TipoCorreccionEnum.MODIFICACION, TipoCorreccionEnum.ALTA_MANUAL]:
                v_nuevo = incidencia.valor_nuevo or {}
                fecha_str = v_nuevo.get("fecha_descuadre")   
                hora_str = v_nuevo.get("hora_propuesta")    
                evento_input: Any = v_nuevo.get("evento_solicitado") 

                if not fecha_str or not hora_str:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST, 
                        detail="Datos de tiempo insuficientes en la solicitud."
                    )

                fecha_hora_propuesta = datetime.fromisoformat(f"{fecha_str}T{hora_str}:00")

                sha256_calculado = calcular_hash_fichaje(
                    trabajador_id=str(incidencia.trabajador_id),
                    empresa_id=str(incidencia.empresa_id),
                    tipo_evento_id=str(incidencia.tipo_evento_id),
                    fecha_iso=fecha_hora_propuesta.isoformat()
                )

                centro_id = None
                if fichaje_original and fichaje_original.centro_trabajo_id:
                    centro_id = fichaje_original.centro_trabajo_id
                
                if not centro_id:
                    contrato = db.query(Contratos).filter(Contratos.trabajador_id == incidencia.trabajador_id).first()
                    if contrato and contrato.centro_trabajo_id:
                        centro_id = contrato.centro_trabajo_id

                if not centro_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST, 
                        detail="No se pudo procesar: El trabajador no posee un contrato con centro de trabajo asignado."
                    )

                latitud = None
                longitud = None

                centro_trabajo = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == centro_id).first()
                if centro_trabajo:
                    latitud = getattr(centro_trabajo, 'latitud', None)
                    longitud = getattr(centro_trabajo, 'longitud', None)

                nuevo_fichaje = Fichajes(
                    empresa_id=incidencia.empresa_id,
                    trabajador_id=incidencia.trabajador_id,
                    centro_trabajo_id=centro_id,  
                    tipo_evento_id=incidencia.tipo_evento_id,
                    fecha_hora=fecha_hora_propuesta,
                    fecha_hora_dispositivo=fecha_hora_propuesta,
                    metodo_fichaje=MetodoFichajeEnum.WEB,  
                    origen=OrigenFichajeEnum.CORRECCION_RRHH,
                    estado=EstadoFichajeEnum.VALIDO,
                    hash_integridad=sha256_calculado,
                    latitud=latitud,      
                    longitud=longitud,    
                    fichaje_sustituido_id=incidencia.fichaje_afectado_id, 
                    observaciones=f"Fichaje corrector mediante incidencia: {incidencia.motivo}"
                )
                db.add(nuevo_fichaje)

        db.commit()
        
        incidencia_actualizada = db.query(CorreccionesFichaje).options(
            joinedload(CorreccionesFichaje.empresa),
            joinedload(CorreccionesFichaje.trabajador),
            joinedload(CorreccionesFichaje.solicitado_por_usuario),
            joinedload(CorreccionesFichaje.aprobado_por_usuario)
        ).filter(CorreccionesFichaje.id == id_correccion).first()
        
        return incidencia_actualizada

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al resolver la corrección de fichajes: {str(e)}"
        )
    

@router.delete("/{id_correccion}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar solicitud de corrección")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def eliminar_solicitud_correccion(
    request: Request,
    id_correccion: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **DELETE /api/correcciones/{id_correccion}**
    
    Elimina físicamente un registro de solicitud de corrección por su ID.
    Retorna un estado 204 No Content si la operación es exitosa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de eliminación de la solicitud {id_correccion} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    solicitud = db.query(CorreccionesFichaje).filter(CorreccionesFichaje.id == id_correccion).first()
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Solicitud de corrección con ID ({id_correccion}) no encontrada."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != solicitud.empresa_id:
        if usuario_actual.id != solicitud.solicitado_por_usuario_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No tienes permisos para eliminar esta solicitud de corrección."
            )

    try:
        db.delete(solicitud)
        db.commit()
        return
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al eliminar la solicitud de corrección: {str(error)}"
        )


@router.get("/empresa/{id_empresa}", response_model=List[CorreccionFichajeResponse], summary="Obtener correcciones por empresa")
@limiter.limit("60/minute")  # Limita las consultas masivas de listados de correcciones por empresa
def obtener_correcciones_por_empresa(
    request: Request,
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/correcciones/empresa/{id_empresa}**
    
    Filtra las peticiones dentro de un mismo tenant (útil para el panel de RRHH de la empresa).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de correcciones para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes autorización para consultar las correcciones de esta empresa."
        )

    return (
        db.query(CorreccionesFichaje)
        .options(
            joinedload(CorreccionesFichaje.empresa),
            joinedload(CorreccionesFichaje.trabajador),
            joinedload(CorreccionesFichaje.solicitado_por_usuario),
            joinedload(CorreccionesFichaje.aprobado_por_usuario)
        )
        .filter(CorreccionesFichaje.empresa_id == id_empresa)
        .all()
    )


@router.get("/trabajador/{id_trabajador}", response_model=List[CorreccionFichajeResponse], summary="Obtener correcciones por trabajador")
@limiter.limit("60/minute")  # Limita las consultas masivas de listados de correcciones por trabajador
def obtener_correcciones_por_trabajador(
    request: Request,
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/correcciones/trabajador/{id_trabajador}**
    
    Permite al empleado seguir el estado de sus peticiones enviadas desde la app móvil.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de correcciones para el trabajador {id_trabajador} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Trabajador con ID ({id_trabajador}) no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != trabajador.empresa_id:
        if usuario_actual.trabajador_id != id_trabajador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No tienes permisos para consultar las correcciones de este trabajador."
            )

    return (
        db.query(CorreccionesFichaje)
        .options(
            joinedload(CorreccionesFichaje.empresa),
            joinedload(CorreccionesFichaje.trabajador),
            joinedload(CorreccionesFichaje.solicitado_por_usuario),
            joinedload(CorreccionesFichaje.aprobado_por_usuario)
        )
        .filter(CorreccionesFichaje.trabajador_id == id_trabajador)
        .all()
    )