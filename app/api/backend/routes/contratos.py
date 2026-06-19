from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from uuid import UUID
from core.database import get_db
from models.empresas import Empresas
from schemas.contratos import ContratoCreate, ContratoResponse
from models.trabajadores import Trabajadores
from models.centros_trabajo import CentrosTrabajo
from models.departamentos import Departamentos
from models.contratos import Contratos

router = APIRouter(prefix="/api/contratos", tags=["Contratos"])

@router.post("", response_model=ContratoResponse, status_code=status.HTTP_201_CREATED)
def crear_contrato(obj_in: ContratoCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/contratos
    Registra un nuevo contrato laboral en el sistema validando la coherencia estructural de las entidades.
    """
    # 1. Validaciones estructurales de existencia (Aislamiento Multiempresa/Tenant)
    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada.")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == obj_in.trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == obj_in.centro_trabajo_id).first()
    if not centro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro de trabajo no encontrado.")

    if obj_in.departamento_id:
        departamento = db.query(Departamentos).filter(Departamentos.id == obj_in.departamento_id).first()
        if not departamento:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento no encontrado.")

    # 2. Mapeo y volcado directo al modelo físico de la base de datos de producción
    nuevo_contrato = Contratos(
        trabajador_id=obj_in.trabajador_id,
        empresa_id=obj_in.empresa_id,
        centro_trabajo_id=obj_in.centro_trabajo_id,
        tipo_contrato=obj_in.tipo_contrato,
        tipo_jornada=obj_in.tipo_jornada,
        horas_semana=obj_in.horas_semana,
        fecha_inicio=obj_in.fecha_inicio,
        departamento_id=obj_in.departamento_id,
        puesto_trabajo=obj_in.puesto_trabajo,
        categoria_profesional=obj_in.categoria_profesional,
        fecha_fin=obj_in.fecha_fin,
        activo=True # Alta activa por defecto
    )

    try:
        db.add(nuevo_contrato)
        db.commit()
        db.refresh(nuevo_contrato)
        return nuevo_contrato
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error de integridad al registrar el contrato: {str(error)}"
        )


@router.get("", response_model=List[ContratoResponse])
def obtener_todos_los_contratos(db: Session = Depends(get_db)):
    """
    URI: GET /api/contratos
    Devuelve la nómina contractual global absoluta del sistema Saas para auditorías globales de la gestoría.
    """
    return db.query(Contratos).all()


@router.get("/trabajador/{id_trabajador}", response_model=List[ContratoResponse])
def obtener_contratos_por_trabajador(id_trabajador: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/contratos/trabajador/{id_trabajador}
    Recupera la secuencia histórica de contratos asociados al expediente de un empleado.
    """
    return db.query(Contratos).filter(Contratos.trabajador_id == id_trabajador).all()


@router.get("/empresa/{id_empresa}", response_model=List[ContratoResponse])
def obtener_contratos_por_empresa(id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/contratos/empresa/{id_empresa}
    Filtra los contratos de forma aislada para el panel de administración de una empresa cliente (tenant).
    """
    return db.query(Contratos).filter(Contratos.empresa_id == id_empresa).all()


@router.put("/{id_contrato}/dar-baja", response_model=ContratoResponse)
def rescindir_contrato(id_contrato: UUID, fecha_fin: datetime, db: Session = Depends(get_db)):
    """
    URI: PUT /api/contratos/{id_contrato}/dar-baja?fecha_fin=AAAA-MM-DD
    Finaliza la vigencia de un contrato laboral aplicando la baja lógica y guardando la fecha de cese de actividad.
    """
    contrato = db.query(Contratos).filter(Contratos.id == id_contrato).first()
    if not contrato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato laboral no encontrado.")

    if contrato.fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="La fecha de cese no puede ser anterior al inicio del contrato."
        )

    # Uso seguro de setattr para eludir avisos de tipo y actualizar los hilos de auditoría
    setattr(contrato, "activo", False)
    setattr(contrato, "fecha_fin", fecha_fin)
    setattr(contrato, "updated_at", datetime.now())

    db.commit()
    db.refresh(contrato)
    return contrato
