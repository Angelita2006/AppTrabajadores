from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
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
from models.contratos_calendarios import ContratosCalendarios
from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum

# APIRouter agrupa todos los endpoints relacionados con la gestión de contratos bajo el prefijo "/api/contratos".
router = APIRouter(prefix="/api/contratos", tags=["Contratos"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
# Esto previene ataques de fuerza bruta o saturación de peticiones en rutas críticas.
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=ContratoResponse, status_code=status.HTTP_201_CREATED, summary="Crear contrato laboral")
@limiter.limit("20/minute") 
def crear_contrato(
    request: Request,
    obj_in: ContratoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **POST /api/contratos**
    
    Registra un nuevo contrato laboral en el sistema validando la coherencia estructural de las entidades.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de contrato desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para crear contratos en esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Empresa con ID ({obj_in.empresa_id}) no encontrada."
        )

    trabajador = db.query(Trabajadores).filter(
        Trabajadores.id == obj_in.trabajador_id,
        Trabajadores.activo.is_(True),
    ).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Trabajador con ID ({obj_in.trabajador_id}) no encontrado."
        )

    centro = db.query(CentrosTrabajo).filter(
        CentrosTrabajo.id == obj_in.centro_trabajo_id,
        CentrosTrabajo.activo.is_(True),
    ).first()
    if not centro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Centro de trabajo con ID ({obj_in.centro_trabajo_id}) no encontrado."
        )

    if trabajador.empresa_id != obj_in.empresa_id or centro.empresa_id != obj_in.empresa_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trabajador, centro y contrato deben pertenecer a la misma empresa.")

    departamento = db.query(Departamentos).filter(
        Departamentos.id == obj_in.departamento_id,
        Departamentos.empresa_id == obj_in.empresa_id,
        Departamentos.activo.is_(True),
    ).first()
    if not departamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Departamento con ID ({obj_in.departamento_id}) no encontrado en la empresa."
        )

    contrato_activo = db.query(Contratos).filter(
        Contratos.empresa_id == obj_in.empresa_id,
        Contratos.trabajador_id == obj_in.trabajador_id,
        Contratos.activo.is_(True),
    ).first()
    if contrato_activo:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El trabajador ya tiene un contrato marcado activo en esta empresa; finaliza el anterior antes de crear otro.")

    calendarios = db.query(CalendariosLaborales).filter(
        CalendariosLaborales.id.in_(obj_in.calendario_ids),
        CalendariosLaborales.empresa_id == obj_in.empresa_id,
        CalendariosLaborales.centro_trabajo_id == obj_in.centro_trabajo_id,
        CalendariosLaborales.activo.is_(True),
    ).all()
    if len(calendarios) != len(set(obj_in.calendario_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Todos los calendarios deben existir, estar activos y pertenecer al centro del contrato.")
    calendario_por_anio = {calendario.anio: calendario for calendario in calendarios}
    ultimo_anio_requerido = obj_in.fecha_fin.year if obj_in.fecha_fin else max(obj_in.fecha_inicio.year, date.today().year)
    anios_requeridos = set(range(obj_in.fecha_inicio.year, ultimo_anio_requerido + 1))
    if not anios_requeridos.issubset(calendario_por_anio):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asocia un calendario del centro por cada año cubierto por el contrato.")

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
        activo=True 
    )

    try:
        db.add(nuevo_contrato)
        db.flush()
        for calendario in calendarios:
            db.add(ContratosCalendarios(
                empresa_id=obj_in.empresa_id,
                centro_trabajo_id=obj_in.centro_trabajo_id,
                contrato_id=nuevo_contrato.id,
                calendario_id=calendario.id,
            ))
        db.flush()
        db.commit()
        
        contrato_creado = db.query(Contratos).options(
            joinedload(Contratos.empresa),
            joinedload(Contratos.centro_trabajo),
            joinedload(Contratos.trabajador),
            joinedload(Contratos.departamento),
            joinedload(Contratos.calendarios_asociados).joinedload(ContratosCalendarios.calendario)
        ).filter(Contratos.id == nuevo_contrato.id).first()
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=obj_in.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "contratos", "accion": "crear", "entidad_id": str(nuevo_contrato.id), "detalles": f"Se creó el contrato para el trabajador {obj_in.trabajador_id}"}
        )
        
        return contrato_creado
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido registrar el contrato: {str(error)}"
        )

@router.put("/{id_contrato}", response_model=ContratoResponse, summary="Actualizar contrato")
@limiter.limit("20/minute")  
def actualizar_contrato(
    request: Request,
    id_contrato: UUID, 
    obj_in: ContratoUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/contratos/{id_contrato}**
    
    Actualiza los datos de un contrato existente mediante un modelo de parcheo (Patch).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de actualización del contrato {id_contrato} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    contrato = db.query(Contratos).filter(Contratos.id == id_contrato).first()
    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Contrato con ID ({id_contrato}) no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != contrato.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para modificar este contrato."
        )

    update_data = obj_in.model_dump(exclude_unset=True)
    calendario_ids = update_data.pop('calendario_ids', None)

    if "departamento_id" in update_data:
        if update_data["departamento_id"] is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Todo contrato debe conservar un departamento asociado.")
        depto = db.query(Departamentos).filter(Departamentos.id == update_data["departamento_id"]).first()
        if not depto or depto.empresa_id != contrato.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Departamento con ID ({update_data['departamento_id']}) no encontrado en la empresa del contrato."
            )

    fecha_inicio_nueva = update_data.get('fecha_inicio', contrato.fecha_inicio)
    fecha_fin_nueva = update_data.get('fecha_fin', contrato.fecha_fin)
    if calendario_ids is not None:
        calendarios = db.query(CalendariosLaborales).filter(
            CalendariosLaborales.id.in_(calendario_ids),
            CalendariosLaborales.empresa_id == contrato.empresa_id,
            CalendariosLaborales.centro_trabajo_id == contrato.centro_trabajo_id,
            CalendariosLaborales.activo.is_(True),
        ).all()
        if len(calendarios) != len(set(calendario_ids)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Los calendarios deben pertenecer al centro del contrato y estar activos.")
        to_year = fecha_fin_nueva.year if fecha_fin_nueva else max(fecha_inicio_nueva.year, date.today().year)
        if not set(range(fecha_inicio_nueva.year, to_year + 1)).issubset({c.anio for c in calendarios}):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debe haber un calendario asociado por cada año cubierto por el contrato.")
    else:
        calendarios = None

    for field, value in update_data.items():
        setattr(contrato, field, value)

    try:
        if calendarios is not None:
            db.query(ContratosCalendarios).filter(
                ContratosCalendarios.contrato_id == contrato.id
            ).delete(synchronize_session=False)
            db.flush()
            db.add_all([
                ContratosCalendarios(
                    empresa_id=contrato.empresa_id,
                    centro_trabajo_id=contrato.centro_trabajo_id,
                    contrato_id=contrato.id,
                    calendario_id=calendario.id,
                )
                for calendario in calendarios
            ])
        elif 'fecha_inicio' in update_data or 'fecha_fin' in update_data:
            years_linked = {
                year
                for (year,) in db.query(CalendariosLaborales.anio)
                .join(ContratosCalendarios, ContratosCalendarios.calendario_id == CalendariosLaborales.id)
                .filter(ContratosCalendarios.contrato_id == contrato.id)
                .all()
            }
            to_year = fecha_fin_nueva.year if fecha_fin_nueva else max(fecha_inicio_nueva.year, date.today().year)
            if not set(range(fecha_inicio_nueva.year, to_year + 1)).issubset(years_linked):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nuevo periodo requiere calendarios anuales; envía calendario_ids para asociarlos.")
        contrato.updated_at = datetime.now()
        db.commit()
        
        contrato_actualizado = db.query(Contratos).options(
            joinedload(Contratos.empresa),
            joinedload(Contratos.centro_trabajo),
            joinedload(Contratos.trabajador),
            joinedload(Contratos.departamento),
            joinedload(Contratos.calendarios_asociados).joinedload(ContratosCalendarios.calendario)
        ).filter(Contratos.id == id_contrato).first()
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=contrato.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "contratos", "accion": "actualizar", "entidad_id": str(contrato.id), "detalles": f"Se actualizó el contrato {contrato.id}"}
        )
        
        return contrato_actualizado
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"No se ha podido actualizar el contrato: {str(error)}"
        )


@router.put("/{id_contrato}/dar-baja", response_model=ContratoResponse, summary="Rescindir contrato")
@limiter.limit("20/minute")  
def rescindir_contrato(
    request: Request,
    id_contrato: UUID, 
    fecha_fin: date, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/contratos/{id_contrato}/dar-baja**
    
    Establece la fecha de cese (fecha_fin) y desactiva el contrato laboral.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de baja del contrato {id_contrato} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    contrato = db.query(Contratos).filter(Contratos.id == id_contrato).first()
    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Contrato laboral con ID ({id_contrato}) no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != contrato.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para dar de baja este contrato."
        )

    if contrato.fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Acción bloqueada: La fecha de cese no puede ser anterior al inicio del contrato."
        )

    try:
        setattr(contrato, "activo", False)
        setattr(contrato, "fecha_fin", fecha_fin)
        setattr(contrato, "updated_at", datetime.now())

        db.commit()
        
        contrato_dado_de_baja = db.query(Contratos).options(
            joinedload(Contratos.empresa),
            joinedload(Contratos.centro_trabajo),
            joinedload(Contratos.trabajador),
            joinedload(Contratos.departamento),
            joinedload(Contratos.calendarios_asociados).joinedload(ContratosCalendarios.calendario)
        ).filter(Contratos.id == id_contrato).first()
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=contrato.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "contratos", "accion": "dar_baja", "entidad_id": str(contrato.id), "detalles": f"Se dio de baja/rescindió el contrato {contrato.id}"}
        )
        
        return contrato_dado_de_baja
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido dar de baja el contrato: {str(error)}"
        )


@router.delete("/empresa/{empresa_id}/trabajador/{trabajador_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar todos los contratos de un trabajador")
@limiter.limit("20/minute") 
def eliminar_todos_los_contratos_trabajador(
    request: Request,
    empresa_id: UUID, 
    trabajador_id: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **DELETE /api/contratos/empresa/{empresa_id}/trabajador/{trabajador_id}**
    
    Elimina TODOS los registros de contratos asociados a un trabajador dentro de una empresa específica.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de eliminación masiva de contratos para el trabajador {trabajador_id} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para eliminar contratos en esta empresa."
        )

    contratos = db.query(Contratos).filter(
        Contratos.trabajador_id == trabajador_id,
        Contratos.empresa_id == empresa_id
    ).all()
    
    if not contratos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"No se encontraron contratos para el trabajador con ID ({trabajador_id}) en esta empresa."
        )

    try:
        db.query(Contratos).filter(
            Contratos.trabajador_id == trabajador_id,
            Contratos.empresa_id == empresa_id
        ).delete(synchronize_session=False)
        
        db.commit()
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=empresa_id,
            accion=AccionAuditoriaEnum.ELIMINACION,
            detalle={"recurso": "contratos", "accion": "eliminar_masivo", "entidad_id": str(trabajador_id), "detalles": f"Se eliminaron todos los contratos del trabajador {trabajador_id}"}
        )
        
        return None
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se han podido eliminar los contratos del trabajador: {str(error)}"
        )

@router.get("/trabajador/{id_trabajador}", response_model=List[ContratoResponse], summary="Obtener contratos por trabajador")
@limiter.limit("60/minute") 
def obtener_contratos_por_trabajador(
    request: Request,
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/contratos/trabajador/{id_trabajador}**
    
    Recupera la secuencia histórica de contratos asociados al expediente de un empleado.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de contratos para el trabajador {id_trabajador} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

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
                detail="Acceso denegado. No tienes permisos para consultar los contratos de este trabajador."
            )

    contratos = (
        db.query(Contratos)
        .options(
            joinedload(Contratos.empresa),
            joinedload(Contratos.centro_trabajo),
            joinedload(Contratos.trabajador),
            joinedload(Contratos.departamento),
            joinedload(Contratos.calendarios_asociados).joinedload(ContratosCalendarios.calendario)
        )
        .filter(Contratos.trabajador_id == id_trabajador)
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "contratos", "accion": "consultar_por_trabajador", "entidad_id": str(id_trabajador)}
    )

    return contratos


@router.get("/empresa/{id_empresa}", response_model=List[ContratoResponse], summary="Obtener contratos por empresa")
@limiter.limit("60/minute")  
def obtener_contratos_por_empresa(
    request: Request,
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/contratos/empresa/{id_empresa}**
    
    Filtra los contratos de forma aislada para el panel de administración de una empresa cliente (tenant).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de contratos para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes autorización para consultar los contratos de esta empresa."
        )

    contratos = (
        db.query(Contratos)
        .options(
            joinedload(Contratos.empresa),
            joinedload(Contratos.centro_trabajo),
            joinedload(Contratos.trabajador),
            joinedload(Contratos.departamento),
            joinedload(Contratos.calendarios_asociados).joinedload(ContratosCalendarios.calendario)
        )
        .filter(Contratos.empresa_id == id_empresa)
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "contratos", "accion": "consultar_por_empresa"}
    )

    return contratos


@router.get("/trabajador/{id_trabajador}/empresa/{id_empresa}/activo", response_model=ContratoResponse, summary="Obtener contrato activo de un trabajador")
@limiter.limit("60/minute")  
def obtener_contrato_activo_trabajador_empresa(
    request: Request,
    id_trabajador: UUID, 
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/contratos/trabajador/{id_trabajador}/empresa/{id_empresa}/activo**
    
    Busca el contrato vigente real de un trabajador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de contrato activo para el trabajador {id_trabajador} en la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        if usuario_actual.trabajador_id != id_trabajador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No tienes autorización para consultar el contrato activo de este trabajador."
            )

    hoy = date.today()
    
    contrato_activo = (
        db.query(Contratos)
        .options(
            joinedload(Contratos.empresa),
            joinedload(Contratos.centro_trabajo),
            joinedload(CentrosTrabajo.empresa) if False else joinedload(Contratos.trabajador),
            joinedload(Contratos.departamento),
            joinedload(Contratos.calendarios_asociados).joinedload(ContratosCalendarios.calendario)
        )
        .filter(
            Contratos.trabajador_id == id_trabajador,
            Contratos.empresa_id == id_empresa,  
            Contratos.activo == True,
            Contratos.fecha_inicio <= hoy,
            or_(
                Contratos.fecha_fin.is_(None),
                Contratos.fecha_fin >= hoy
            )
        )
        .order_by(Contratos.fecha_inicio.desc())
        .first()
    )

    if not contrato_activo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"No se ha encontrado ningún contrato activo para el trabajador con ID ({id_trabajador}) en la empresa seleccionada."
        )
        
    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "contratos", "accion": "consultar_activo", "entidad_id": str(contrato_activo.id)}
    )

    return contrato_activo