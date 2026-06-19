from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from uuid import UUID
from core.database import get_db
from models.empresas import Empresas
from enums import EstadoCorreccionEnum
from schemas.correcciones_fichaje import CorreccionFichajeCreate, CorreccionFichajeResponse
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from models.fichajes import Fichajes
from models.correcciones_fichaje import CorreccionesFichaje

router = APIRouter(prefix="/api/correcciones", tags=["Correcciones de Fichaje"])

@router.post("", response_model=CorreccionFichajeResponse, status_code=status.HTTP_201_CREATED)
def solicitar_correccion(obj_in: CorreccionFichajeCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/correcciones
    Crea una nueva solicitud de rectificación horaria en estado 'pendiente' por defecto.
    """
    # 1. Validaciones estructurales básicas de existencia
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

    # 2. Volcado directo al modelo relacional de SQLAlchemy
    nueva_correccion = CorreccionesFichaje(
        empresa_id=obj_in.empresa_id,
        trabajador_id=obj_in.trabajador_id,
        tipo_correccion=obj_in.tipo_correccion,
        valor_nuevo=obj_in.valor_nuevo,
        motivo=obj_in.motivo,
        solicitado_por_usuario_id=obj_in.solicitado_por_usuario_id,
        fichaje_afectado_id=obj_in.fichaje_afectado_id,
        valor_anterior=obj_in.valor_anterior,
        estado=EstadoCorreccionEnum.PENDIENTE # Forzado por seguridad en la API
    )

    db.add(nueva_correccion)
    db.commit()
    db.refresh(nueva_correccion)
    return nueva_correccion


@router.get("", response_model=List[CorreccionFichajeResponse])
def obtener_todas_las_correcciones(db: Session = Depends(get_db)):
    """
    URI: GET /api/correcciones
    Lista el histórico completo de solicitudes guardadas en el Saas para auditorías globales.
    """
    return db.query(CorreccionesFichaje).all()


@router.get("/empresa/{id_empresa}", response_model=List[CorreccionFichajeResponse])
def obtener_correcciones_por_empresa(id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/correcciones/empresa/{id_empresa}
    Filtra las peticiones dentro de un mismo tenant (útil para el panel de RRHH de la empresa).
    """
    return db.query(CorreccionesFichaje).filter(CorreccionesFichaje.empresa_id == id_empresa).all()


@router.get("/trabajador/{id_trabajador}", response_model=List[CorreccionFichajeResponse])
def obtener_correcciones_por_trabajador(id_trabajador: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/correcciones/trabajador/{id_trabajador}
    Permite al empleado seguir el estado de sus peticiones enviadas desde la app móvil.
    """
    return db.query(CorreccionesFichaje).filter(CorreccionesFichaje.trabajador_id == id_trabajador).all()


@router.put("/{id_correccion}/resolver", response_model=CorreccionFichajeResponse)
def resolver_solicitud_correccion(
    id_correccion: UUID, 
    nuevo_estado: EstadoCorreccionEnum, 
    resolutor_usuario_id: UUID, 
    db: Session = Depends(get_db)
):
    """
    URI: PUT /api/correcciones/{id_correccion}/resolver?nuevo_estado=aprobada&resolutor_usuario_id=UUID
    Tramita la resolución de una solicitud pendiente para cambiarla a aprobada o rechazada.
    """
    solicitud = db.query(CorreccionesFichaje).filter(CorreccionesFichaje.id == id_correccion).first()
    if not solicitud:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud de corrección no encontrada.")

    if solicitud.estado != EstadoCorreccionEnum.PENDIENTE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta solicitud ya ha sido resuelta previamente.")

    resolutor = db.query(Usuarios).filter(Usuarios.id == resolutor_usuario_id).first()
    if not resolutor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario resolutor no encontrado.")

    # Inyección de los campos de resolución blindando el tipado estricto
    setattr(solicitud, "estado", nuevo_estado)
    setattr(solicitud, "aprobado_por_usuario_id", resolutor_usuario_id)
    setattr(solicitud, "fecha_resolucion", datetime.now())

    # LÓGICA DE PRODUCCIÓN IMPORTANTE:
    # Si la solicitud es 'aprobada', el proceso correspondiente (o un trigger en la base de datos)
    # se encargará de insertar la nueva fila inmutable en la tabla 'fichajes' con el origen
    # configurado como 'correccion_rrhh', enlazando el 'fichaje_sustituido_id' si correspondiera.

    db.commit()
    db.refresh(solicitud)
    return solicitud
