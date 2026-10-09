from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.asignaciones_turno import AsignacionesTurno
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from schemas.turnos import TurnoCreate, TurnoResponse, TurnoUpdate
from models.turnos import Turnos
from models.usuarios import Usuarios
from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum

# Configuración del enrutador para la gestión de turnos laborales
router = APIRouter(prefix="/api/turnos", tags=["Turnos Laborales"])

# Configuración del limitador de tasa de peticiones por IP
limiter = Limiter(key_func=get_remote_address)

@router.get("/empresa/{id_empresa}", response_model=List[TurnoResponse], summary="Obtener turnos por empresa")
@limiter.limit("60/minute")
def obtener_turnos_empresa(
    request: Request,
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/turnos/empresa/{id_empresa}**
    
    Recupera los cuadrantes horarios de una empresa específica aplicando aislamiento multi-tenant.
    """
    # Registrar la dirección IP del cliente y metadatos de auditoría para trazabilidad de acceso
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de turnos de la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    # Validar que la empresa exista en el sistema antes de consultar sus turnos
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La empresa especificada no existe en el sistema."
        )

    # Validar aislamiento multi-tenant: comprobar permisos si el usuario no pertenece a la misma empresa ni es gestor global
    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los turnos de esta empresa."
        )

    turnos = db.query(Turnos).options(
        joinedload(Turnos.empresa)
    ).filter(Turnos.empresa_id == id_empresa, Turnos.activo.is_(True)).order_by(Turnos.nombre.asc()).all()

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "turnos", "accion": "obtener_por_empresa", "entidad_id": str(id_empresa), "detalles": f"Se consultó el listado de turnos de la empresa {id_empresa}"}
    )
    db.commit()

    return turnos


@router.get("/{id_turno}", response_model=TurnoResponse, summary="Obtener turno por ID")
@limiter.limit("60/minute") 
def obtener_turno_laboral(
    request: Request,
    id_turno: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/turnos/{id_turno}**
    
    Busca un turno específico validando que pertenezca al ámbito del usuario.
    """
    # Registrar la dirección IP del cliente y trazas de seguridad
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle del turno {id_turno} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    turno = db.query(Turnos).options(
        joinedload(Turnos.empresa)
    ).filter(Turnos.id == id_turno).first()
    
    if not turno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ningún turno con el ID {id_turno}."
        )

    # Validar aislamiento multi-tenant
    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != turno.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para ver los detalles de este turno."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=turno.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "turnos", "accion": "obtener_por_id", "entidad_id": str(id_turno), "detalles": f"Se consultó el detalle del turno {id_turno}"}
    )
    db.commit()

    return turno


@router.post("", response_model=TurnoResponse, status_code=status.HTTP_201_CREATED, summary="Crear turno laboral")
@limiter.limit("20/minute") 
def crear_turno_laboral(
    request: Request,
    obj_in: TurnoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **POST /api/turnos**
    
    Registra un nuevo cuadrante de turno teórico validando empresa y permisos.
    """
    # Registrar metadatos de red y auditoría del administrador creador
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de turno desde IP: {cliente_ip} por el administrador: {usuario_actual.email}")

    # Validar permisos empresariales cruzados
    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear turnos en una empresa diferente a la tuya."
        )

    try:
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La empresa especificada para asignar el turno no existe en el sistema."
            )

        nuevo_turno = Turnos(
            empresa_id=obj_in.empresa_id,
            nombre=obj_in.nombre,
            hora_inicio=obj_in.hora_inicio,
            hora_fin=obj_in.hora_fin,
            duracion_pausa_minutos=obj_in.duracion_pausa_minutos,
            dias_semana=obj_in.dias_semana 
        )
        
        db.add(nuevo_turno)
        db.flush()

        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=obj_in.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "turnos", "accion": "crear", "entidad_id": str(nuevo_turno.id), "detalles": f"Se creó el turno {nuevo_turno.id}"}
        )

        db.commit()
        
        turno_con_relacion = db.query(Turnos).options(
            joinedload(Turnos.empresa)
        ).filter(Turnos.id == nuevo_turno.id).first()
        
        return turno_con_relacion

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido guardar el turno laboral: {str(error)}"
        )


@router.put("/{id_turno}/editar", response_model=TurnoResponse, summary="Editar turno laboral")
@limiter.limit("20/minute") 
def editar_turno(
    request: Request,
    id_turno: UUID, 
    obj_in: TurnoUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/turnos/{id_turno}/editar**
    
    Modifica un turno validando la pertenencia a la empresa o rol de administrador.
    """
    # Registrar metadatos de red y auditoría de la edición
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de edición del turno {id_turno} desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    turno = db.query(Turnos).filter(Turnos.id == id_turno).first()
    if not turno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ningún turno con el ID {id_turno} para actualizar."
        )

    # Validar permisos multi-tenant
    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != turno.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar este turno perteneciente a otra empresa."
        )
    
    update_data = obj_in.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        if hasattr(turno, key):
            setattr(turno, key, value)
    
    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=turno.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "turnos", "accion": "editar", "entidad_id": str(id_turno), "detalles": f"Se editó el turno {id_turno}"}
        )
        db.commit()
        
        # Consulta de refresco aplicando joinedload para asegurar la relación con empresa
        turno_actualizado = db.query(Turnos).options(
            joinedload(Turnos.empresa)
        ).filter(Turnos.id == id_turno).first()
        
        return turno_actualizado
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido actualizar el turno en la base de datos: {str(error)}"
        )

@router.put("/{id_turno}/desactivar", status_code=status.HTTP_200_OK, summary="Dar de baja lógica turno laboral")
@limiter.limit("20/minute") 
def dar_de_baja_turno(
    request: Request,
    id_turno: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/turnos/{id_turno}/desactivar**
    
    Da de baja un turno validando previamente que no existan contratos o asignaciones activas asociadas.
    """
    # Registrar metadatos de red y auditoría de la eliminación
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de baja del turno {id_turno} desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    turno = db.query(Turnos).filter(Turnos.id == id_turno).first()
    if not turno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turno laboral con ID {id_turno} no localizado en el sistema."
        )

    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != turno.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar este turno."
        )
    
    turno.activo = False
    turno.updated_at = datetime.now()

    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=turno.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "turnos", "accion": "desactivar", "entidad_id": str(id_turno), "detalles": f"Se desactivó el turno {id_turno}"}
        )
        db.commit()
        return {"detail": f"Turno con ID {id_turno} desactivado correctamente y enviado a la papelera."}
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido desactivar el turno: {str(error)}"
        )