from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List
from uuid import UUID
from core.database import get_db
from empresas import Empresas
from schemas.resumenes_jornada import ResumenJornadaCreate, ResumenJornadaResponse
from trabajadores import Trabajadores
from resumenes_jornada import ResumenesJornada

router = APIRouter(prefix="/api/resumenes-jornada", tags=["Resúmenes de Jornada"])

@router.post("", response_model=ResumenJornadaResponse, status_code=status.HTTP_201_CREATED)
def crear_o_actualizar_resumen(obj_in: ResumenJornadaCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/resumenes-jornada
    Registra el cálculo acumulado diario de un operario. Si ya existe la combinación 
    trabajador + fecha, actualiza los minutos acumulados emulando una operación 'upsert'.
    """
    # 1. Validaciones estructurales básicas de aislamiento de datos (Tenant)
    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada.")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    # 2. Comprobación de la restricción de unicidad compuesta (trabajador_id + fecha)
    # resumen = db.query(ResumenesJornada).filter_by(
    #     db=db, 
    #     trabajador_id=obj_in.trabajador_id, 
    #     fecha_dia=obj_in.fecha
    # )

    resumen = db.query(ResumenesJornada).filter(
        ResumenesJornada.trabajador_id == obj_in.trabajador_id,
        ResumenesJornada.fecha == obj_in.fecha
    ).first()

    # 3. Si no existe, se genera una nueva fila en el sistema Saas
    if not resumen:
        resumen = ResumenesJornada(
            empresa_id=obj_in.empresa_id,
            trabajador_id=obj_in.trabajador_id,
            fecha=obj_in.fecha
        )
        db.add(resumen)

    # 4. Si el registro ya fue bloqueado y consolidado para nómina, se impide su alteración
    if resumen.cerrado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Acción denegada. Los cálculos de esta jornada ya han sido consolidados y cerrados."
        )

    # 5. Volcado e inyección segura de las horas computadas y hilos de auditoría
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
def obtener_todos_los_resumenes(db: Session = Depends(get_db)):
    """
    URI: GET /api/resumenes-jornada
    Lista el histórico total de cálculos diarios consolidados en la plataforma Saas.
    """
    return db.query(ResumenesJornada).all()


@router.get("/trabajador/{id_trabajador}", response_model=List[ResumenJornadaResponse])
def obtener_resumenes_por_trabajador(id_trabajador: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/resumenes-jornada/trabajador/{id_trabajador}
    Recupera el calendario mensual o histórico con los totales trabajados de un operario específico.
    """
    return db.query(ResumenesJornada).filter(ResumenesJornada.trabajador_id == id_trabajador).order_by(ResumenesJornada.fecha.desc()).all()


@router.get("/empresa/{id_empresa}/fecha/{fecha_dia}", response_model=List[ResumenJornadaResponse])
def obtener_cuadro_mandos_diario_empresa(id_empresa: UUID, fecha_dia: date, db: Session = Depends(get_db)):
    """
    URI: GET /api/resumenes-jornada/empresa/{id_empresa}/fecha/AAAA-MM-DD
    Filtra los acumulados de toda la plantilla en un día concreto. 
    Aprovecha el índice compuesto físico de la base de datos para ofrecer alta velocidad.
    """
    return db.query(ResumenesJornada).filter(
        ResumenesJornada.empresa_id == id_empresa,
        ResumenesJornada.fecha == fecha_dia
    ).all()


@router.put("/{id_resumen}/cerrar", response_model=ResumenJornadaResponse)
def consolidar_jornada_mensual(id_resumen: UUID, db: Session = Depends(get_db)):
    """
    URI: PUT /api/resumenes-jornada/{id_resumen}/cerrar
    Consolida de manera definitiva una fila diaria para bloquearla de cara a la exportación de nómina.
    """
    resumen = db.query(ResumenesJornada).filter(ResumenesJornada.id == id_resumen).first()
    if not resumen:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resumen diario no localizado.")

    setattr(resumen, "cerrado", True)
    setattr(resumen, "actualizado_en", datetime.now())
    
    db.commit()
    db.refresh(resumen)
    return resumen
