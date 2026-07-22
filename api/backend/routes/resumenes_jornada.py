from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List
from uuid import UUID

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.database import get_db
from core.security import obtener_usuario_actual
from models.empresas import Empresas
from schemas.resumenes_jornada import ResumenJornadaCreate, ResumenJornadaResponse
from models.trabajadores import Trabajadores
from models.resumenes_jornada import ResumenesJornada
from models.usuarios import Usuarios

router = APIRouter(prefix="/api/resumenes-jornada", tags=["Resúmenes de Jornada"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=ResumenJornadaResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")  # Protegido frente a escrituras masivas y alta concurrencia en cálculos diarios
def crear_o_actualizar_resumen(
    request: Request,
    obj_in: ResumenJornadaCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/resumenes-jornada
    Registra o actualiza el cálculo acumulado diario de un operario validando permisos de tenant.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar o modificar resúmenes de jornada en esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada.")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    if trabajador.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El trabajador indicado no pertenece a la empresa especificada."
        )

    resumen = db.query(ResumenesJornada).filter(
        ResumenesJornada.trabajador_id == obj_in.trabajador_id,
        ResumenesJornada.fecha == obj_in.fecha
    ).first()

    if not resumen:
        resumen = ResumenesJornada(
            empresa_id=obj_in.empresa_id,
            trabajador_id=obj_in.trabajador_id,
            fecha=obj_in.fecha
        )
        db.add(resumen)

    if resumen.cerrado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Acción denegada. Los cálculos de esta jornada ya han sido consolidados y cerrados."
        )

    setattr(resumen, "minutos_trabajados", obj_in.minutos_trabajados)
    setattr(resumen, "minutos_pausa", obj_in.minutos_pausa)
    setattr(resumen, "minutos_extra", obj_in.minutos_extra)
    setattr(resumen, "tiene_incidencia", obj_in.tiene_incidencia)
    setattr(resumen, "cerrado", obj_in.cerrado)
    setattr(resumen, "hora_entrada", obj_in.hora_entrada)
    setattr(resumen, "hora_salida", obj_in.hora_salida)
    setattr(resumen, "actualizado_en", datetime.now())

    try:
        db.commit()
        db.refresh(resumen)
        return resumen
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar el cierre de jornada en el servidor: {str(error)}"
        )


@router.get("", response_model=List[ResumenJornadaResponse])
def obtener_todos_los_resumenes(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/resumenes-jornada
    Lista el histórico total de cálculos diarios aplicando aislamiento estricto por tenant.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    query = db.query(ResumenesJornada).join(ResumenesJornada.trabajador)

    if usuario_actual.tipo_usuario != "Administrador":
        if not usuario_actual.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No estás vinculado a ninguna empresa."
            )
        query = query.filter(ResumenesJornada.empresa_id == usuario_actual.empresa_id)

    return query.order_by(Trabajadores.nombre.asc()).all()


@router.get("/trabajador/{id_trabajador}", response_model=List[ResumenJornadaResponse])
def obtener_resumenes_por_trabajador(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/resumenes-jornada/trabajador/{id_trabajador}
    Recupera el calendario o histórico validando que pertenezca a la empresa del usuario o a su propio perfil.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    if usuario_actual.tipo_usuario != "Administrador":
        if usuario_actual.empresa_id != trabajador.empresa_id and usuario_actual.trabajador_id != id_trabajador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para consultar los resúmenes de este trabajador."
            )

    return db.query(ResumenesJornada).filter(
        ResumenesJornada.trabajador_id == id_trabajador
    ).order_by(ResumenesJornada.fecha.desc()).all()


@router.get("/empresa/{id_empresa}/fecha/{fecha_dia}", response_model=List[ResumenJornadaResponse])
def obtener_cuadro_mandos_diario_empresa(
    id_empresa: UUID, 
    fecha_dia: date, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/resumenes-jornada/empresa/{id_empresa}/fecha/AAAA-MM-DD
    Filtra los acumulados de la plantilla diaria validando el acceso a la empresa.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar el cuadro de mandos de esta empresa."
        )

    return db.query(ResumenesJornada).filter(
        ResumenesJornada.empresa_id == id_empresa,
        ResumenesJornada.fecha == fecha_dia
    ).all()


@router.put("/{id_resumen}/cerrar", response_model=ResumenJornadaResponse)
@limiter.limit("20/minute")  # Protegido frente a bloqueos en lote no deseados de jornadas laborales
def consolidar_jornada_mensual(
    request: Request,
    id_resumen: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: PUT /api/resumenes-jornada/{id_resumen}/cerrar
    Consolida de manera definitiva una fila diaria validando permisos de empresa o administración.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    resumen = db.query(ResumenesJornada).filter(ResumenesJornada.id == id_resumen).first()
    if not resumen:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resumen diario no localizado.")

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != resumen.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para cerrar ni consolidar la jornada de esta empresa."
        )

    setattr(resumen, "cerrado", True)
    setattr(resumen, "actualizado_en", datetime.now())
    
    db.commit()
    db.refresh(resumen)
    return resumen