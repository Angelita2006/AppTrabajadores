from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Any
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.correcciones_fichaje import CorreccionesFichaje
from models.contratos import Contratos
from routes.fichajes import calcular_hash_fichaje, mapear_id_evento
from core.database import get_db
from core.security import obtener_usuario_actual
from models.empresas import Empresas
from models.enums import TipoFichajeEnum, EstadoCorreccionEnum, EstadoFichajeEnum, MetodoFichajeEnum, OrigenFichajeEnum, TipoCorreccionEnum
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from models.fichajes import Fichajes
from schemas.correcciones_fichaje import CorreccionFichajeCreate, CorreccionFichajeResponse

router = APIRouter(prefix="/api/correcciones", tags=["Correcciones de Fichaje"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=CorreccionFichajeResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def solicitar_correccion(
    request: Request,
    obj_in: CorreccionFichajeCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/correcciones
    Crea una nueva solicitud de rectificación horaria en estado 'pendiente' por defecto.
    """
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para solicitar correcciones en esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada.")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    usuario = db.query(Usuarios).filter(Usuarios.id == obj_in.solicitado_por_usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario solicitante no encontrado.")

    if obj_in.fichaje_afectado_id:
        fichaje = db.query(Fichajes).filter(Fichajes.id == obj_in.fichaje_afectado_id).first()
        if not fichaje:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichaje afectado no encontrado.")

    nueva_correccion = CorreccionesFichaje(
        empresa_id=obj_in.empresa_id,
        trabajador_id=obj_in.trabajador_id,
        tipo_correccion=obj_in.tipo_correccion,
        valor_nuevo=obj_in.valor_nuevo,
        motivo=obj_in.motivo,
        solicitado_por_usuario_id=obj_in.solicitado_por_usuario_id,
        fichaje_afectado_id=obj_in.fichaje_afectado_id,
        valor_anterior=obj_in.valor_anterior,
        estado=EstadoCorreccionEnum.PENDIENTE
    )

    db.add(nueva_correccion)
    db.commit()
    db.refresh(nueva_correccion)
    return nueva_correccion


@router.get("", response_model=List[CorreccionFichajeResponse])
def obtener_todas_las_correcciones(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/correcciones
    Lista el histórico completo de solicitudes aplicando aislamiento multi-tenant.
    """
    query = db.query(CorreccionesFichaje)
    
    if usuario_actual.tipo_usuario != "Administrador":
        if not usuario_actual.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No estás vinculado a ninguna empresa."
            )
        query = query.filter(CorreccionesFichaje.empresa_id == usuario_actual.empresa_id)

    return query.all()


@router.get("/empresa/{id_empresa}", response_model=List[CorreccionFichajeResponse])
def obtener_correcciones_por_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/correcciones/empresa/{id_empresa}
    Filtra las peticiones dentro de un mismo tenant (útil para el panel de RRHH de la empresa).
    """
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar las correcciones de esta empresa."
        )

    return db.query(CorreccionesFichaje).filter(CorreccionesFichaje.empresa_id == id_empresa).all()


@router.get("/trabajador/{id_trabajador}", response_model=List[CorreccionFichajeResponse])
def obtener_correcciones_por_trabajador(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/correcciones/trabajador/{id_trabajador}
    Permite al empleado seguir el estado de sus peticiones enviadas desde la app móvil.
    """
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != trabajador.empresa_id:
        if usuario_actual.trabajador_id != id_trabajador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para consultar las correcciones de este trabajador."
            )

    return db.query(CorreccionesFichaje).filter(CorreccionesFichaje.trabajador_id == id_trabajador).all()


@router.put("/{id_correccion}/resolver")
@limiter.limit("20/minute")
def resolver_incidencia(
    request: Request,
    id_correccion: UUID, 
    nuevo_estado: EstadoCorreccionEnum, 
    resolutor_usuario_id: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    incidencia = db.query(CorreccionesFichaje).filter(CorreccionesFichaje.id == id_correccion).first()
    if not incidencia:
        raise HTTPException(status_code=404, detail="Solicitud de corrección no encontrada.")
    
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != incidencia.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para resolver incidencias en esta empresa."
        )

    if incidencia.estado != EstadoCorreccionEnum.PENDIENTE:
        raise HTTPException(status_code=400, detail="Esta incidencia ya fue resuelta previamente.")

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
                        tipo_evento_id=int(fichaje_original.tipo_evento_id),
                        fecha_iso=fichaje_original.fecha_hora.isoformat()
                    )
            
            if incidencia.tipo_correccion in [TipoCorreccionEnum.MODIFICACION, TipoCorreccionEnum.ALTA_MANUAL]:
                v_nuevo = incidencia.valor_nuevo or {}
                fecha_str = v_nuevo.get("fecha_descuadre")   
                hora_str = v_nuevo.get("hora_propuesta")    
                evento_input: Any = v_nuevo.get("evento_solicitado") 

                if not fecha_str or not hora_str:
                    raise HTTPException(status_code=400, detail="Datos de tiempo insuficientes en la solicitud.")

                fecha_hora_propuesta = datetime.fromisoformat(f"{fecha_str}T{hora_str}:00+02:00")

                if isinstance(evento_input, str):
                        id_real_evento = TipoFichajeEnum[evento_input]
                else:
                    id_real_evento = 1
                    raise ValueError

                sha256_calculado = calcular_hash_fichaje(
                    trabajador_id=str(incidencia.trabajador_id),
                    empresa_id=str(incidencia.empresa_id),
                    tipo_evento_id=id_real_evento,
                    fecha_iso=fecha_hora_propuesta.isoformat()
                )

                centro_id = None
                if fichaje_original:
                    centro_id = fichaje_original.centro_trabajo_id
                else:
                    contrato = db.query(Contratos).filter(Contratos.trabajador_id == incidencia.trabajador_id).first()
                    if contrato:
                        centro_id = contrato.centro_trabajo_id
                
                if not centro_id:
                    raise HTTPException(
                        status_code=400, 
                        detail="No se pudo procesar el alta: El trabajador no posee un contrato con centro de trabajo asignado."
                    )

                nuevo_fichaje = Fichajes(
                    empresa_id=incidencia.empresa_id,
                    trabajador_id=incidencia.trabajador_id,
                    centro_trabajo_id=centro_id,  
                    tipo_evento_id=id_real_evento,
                    fecha_hora=fecha_hora_propuesta,
                    fecha_hora_dispositivo=fecha_hora_propuesta,
                    metodo_fichaje=MetodoFichajeEnum.WEB,  
                    origen=OrigenFichajeEnum.CORRECCION_RRHH,
                    estado=EstadoFichajeEnum.VALIDO,
                    hash_integridad=sha256_calculado,
                    fichaje_sustituido_id=incidencia.fichaje_afectado_id, 
                    observaciones=f"Fichaje corrector mediante incidencia: {incidencia.motivo}"
                )
                db.add(nuevo_fichaje)

        db.commit()
        return {"detail": "Incidencia procesada con éxito."}

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error al resolver la corrección de fichajes: {str(e)}"
        )


@router.delete("/{id_correccion}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_solicitud_correccion(
    id_correccion: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: DELETE /api/correcciones/{id_correccion}
    Elimina físicamente un registro de solicitud de corrección por su ID.
    Retorna un estado 204 No Content si la operación es exitosa.
    """
    solicitud = db.query(CorreccionesFichaje).filter(CorreccionesFichaje.id == id_correccion).first()
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Solicitud de corrección no encontrada."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != solicitud.empresa_id:
        if usuario_actual.id != solicitud.solicitado_por_usuario_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para eliminar esta solicitud de corrección."
            )

    db.delete(solicitud)
    db.commit()
    return


@router.put("/correcciones/{id_correccion}/restaurar-pendiente")
@limiter.limit("20/minute")
def restaurar_correccion_pendiente(
    request: Request,
    id_correccion: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    incidencia = db.query(CorreccionesFichaje).filter(CorreccionesFichaje.id == id_correccion).first()
    if not incidencia:
        raise HTTPException(status_code=404, detail="Solicitud de corrección no encontrada.")
    
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != incidencia.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para restaurar esta corrección."
        )
    
    try:
        if incidencia.fichaje_afectado_id:
            db.query(Fichajes).filter(Fichajes.id == incidencia.fichaje_afectado_id).update(
                {Fichajes.estado: EstadoFichajeEnum.VALIDO}
            )
        
        incidencia.estado = EstadoCorreccionEnum.PENDIENTE
        incidencia.resolutor_usuario_id = None
        incidencia.fecha_resolucion = None
        
        db.commit()
        db.refresh(incidencia)
        return {"message": "Incidencia y fichaje original restaurados con éxito", "incidencia": incidencia}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al restaurar la incidencia: {str(e)}"
        )