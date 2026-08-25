from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, date 
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.calendarios_laborales import CalendariosLaborales
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from models.usuarios import Usuarios
from schemas.contratos import ContratoCreate, ContratoResponse, ContratoUpdate
from models.trabajadores import Trabajadores
from models.centros_trabajo import CentrosTrabajo
from models.departamentos import Departamentos
from models.contratos import Contratos

router = APIRouter(prefix="/api/contratos", tags=["Contratos"])

limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=ContratoResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def crear_contrato(
    request: Request,
    obj_in: ContratoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: POST /api/contratos
    Registra un nuevo contrato laboral en el sistema validando la coherencia estructural de las entidades.
    """
    if usuario_actual.empresa_id and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear contratos en esta empresa."
        )

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

    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == obj_in.calendario_laboral_id).first()
    if not calendario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendario laboral no encontrado.")

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
        calendario_laboral_id=obj_in.calendario_laboral_id,
        activo=True 
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

@router.put("/{id_contrato}", response_model=ContratoResponse)
@limiter.limit("20/minute")
def actualizar_contrato(
    request: Request,
    id_contrato: UUID, 
    obj_in: ContratoUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: PUT /api/contratos/{id_contrato}
    Actualiza los datos de un contrato existente mediante un modelo de parcheo (Patch).
    """
    contrato = db.query(Contratos).filter(Contratos.id == id_contrato).first()
    if not contrato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato no encontrado.")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != contrato.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar este contrato."
        )

    # Convertir el modelo Pydantic a diccionario y excluir campos None
    update_data = obj_in.dict(exclude_unset=True)

    # Validar existencia de departamento si se intenta cambiar
    if "departamento_id" in update_data and update_data["departamento_id"]:
        depto = db.query(Departamentos).filter(Departamentos.id == update_data["departamento_id"]).first()
        if not depto:
            raise HTTPException(status_code=404, detail="Departamento destino no encontrado.")

    # Aplicar cambios al modelo
    for field, value in update_data.items():
        setattr(contrato, field, value)

    try:
        db.commit()
        db.refresh(contrato)
        return contrato
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar el contrato: {str(e)}")


@router.put("/{id_contrato}/dar-baja", response_model=ContratoResponse)
@limiter.limit("20/minute")
def rescindir_contrato(
    request: Request,
    id_contrato: UUID, 
    fecha_fin: date, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: PUT /api/contratos/{id_contrato}/dar-baja?fecha_fin=AAAA-MM-DD
    Cambiado fecha_fin a 'date' para concordar con el modelo de datos 
    de la columna física en PostgreSQL y mitigar fallas de guardado.
    """
    contrato = db.query(Contratos).filter(Contratos.id == id_contrato).first()
    if not contrato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato laboral no encontrado.")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != contrato.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para dar de baja este contrato."
        )

    if contrato.fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="La fecha de cese no puede ser anterior al inicio del contrato."
        )

    setattr(contrato, "activo", False)
    setattr(contrato, "fecha_fin", fecha_fin)
    setattr(contrato, "updated_at", datetime.now())

    db.commit()
    db.refresh(contrato)
    return contrato


@router.delete("/api/contratos/empresa/{empresa_id}/trabajador/{trabajador_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_todos_los_contratos_trabajador(
    empresa_id: UUID, 
    trabajador_id: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    Elimina TODOS los registros de contratos asociados a un trabajador 
    dentro de una empresa específica.
    """
    if usuario_actual.empresa_id and usuario_actual.empresa_id != empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar contratos en esta empresa."
        )

    # 1. Verificar si existen contratos antes de intentar eliminar
    contratos = db.query(Contratos).filter(
        Contratos.trabajador_id == trabajador_id,
        Contratos.empresa_id == empresa_id
    ).all()
    
    if not contratos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No se encontraron contratos para este trabajador en esta empresa."
        )

    # 2. Ejecutar la eliminación
    db.query(Contratos).filter(
        Contratos.trabajador_id == trabajador_id,
        Contratos.empresa_id == empresa_id
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return None

@router.get("/trabajador/{id_trabajador}", response_model=List[ContratoResponse])
def obtener_contratos_por_trabajador(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/contratos/trabajador/{id_trabajador}
    Recupera la secuencia histórica de contratos asociados al expediente de un empleado.
    """
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != trabajador.empresa_id:
        if usuario_actual.trabajador_id != id_trabajador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para consultar los contratos de este trabajador."
            )

    return db.query(Contratos).filter(Contratos.trabajador_id == id_trabajador).all()


@router.get("/empresa/{id_empresa}", response_model=List[ContratoResponse])
def obtener_contratos_por_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/contratos/empresa/{id_empresa}
    Filtra los contratos de forma aislada para el panel de administración de una empresa cliente (tenant).
    """
    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los contratos de esta empresa."
        )

    return db.query(Contratos).filter(Contratos.empresa_id == id_empresa).all()


@router.get("/trabajador/{id_trabajador}/empresa/{id_empresa}/activo", response_model=ContratoResponse)
def obtener_contrato_activo_trabajador_empresa(
    id_trabajador: UUID, 
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/contratos/trabajador/{id_trabajador}/empresa/{id_empresa}/activo
    Busca el contrato vigente real de un trabajador asegurando el aislamiento por Empresa (Tenant).
    """
    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        if usuario_actual.trabajador_id != id_trabajador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes autorización para consultar el contrato activo de este trabajador."
            )

    hoy = date.today()
    
    contrato_activo = db.query(Contratos).filter(
        Contratos.trabajador_id == id_trabajador,
        Contratos.empresa_id == id_empresa,  
        Contratos.activo == True,
        Contratos.fecha_inicio <= hoy
    ).filter(
        (Contratos.fecha_fin == None) | (Contratos.fecha_fin >= hoy)
    ).order_by(Contratos.fecha_inicio.desc()).first()

    if not contrato_activo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No se ha encontrado ningún contrato activo para este trabajador en la empresa seleccionada."
        )
        
    return contrato_activo