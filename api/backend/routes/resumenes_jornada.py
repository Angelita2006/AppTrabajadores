from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, date
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from schemas.resumenes_jornada import ResumenJornadaCreate, ResumenJornadaResponse
from models.trabajadores import Trabajadores
from models.resumenes_jornada import ResumenesJornada
from models.usuarios import Usuarios

# Configuración del enrutador para la gestión de resúmenes de jornada y cálculos acumulados diarios
router = APIRouter(prefix="/api/resumenes-jornada", tags=["Resúmenes de Jornada"])

# Configuración del limitador de tasa de peticiones por IP para prevenir abusos y ataques de denegación
limiter = Limiter(key_func=get_remote_address)


@router.get("/trabajador/{id_trabajador}", response_model=List[ResumenJornadaResponse], summary="Obtener resúmenes por trabajador")
@limiter.limit("60/minute") # Limita las consultas masivas de históricos de operarios para proteger el rendimiento de la base de datos
def obtener_resumenes_por_trabajador(
    request: Request,
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **GET /api/resumenes-jornada/trabajador/{id_trabajador}**
    
    Recupera el calendario o histórico validando que pertenezca a la empresa del usuario o a su propio perfil.
    """
    # Registrar la dirección IP del cliente y trazas de auditoría de acceso
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de resúmenes del trabajador {id_trabajador} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado.")

    if usuario_actual.empresa_id != trabajador.empresa_id and usuario_actual.trabajador_id != id_trabajador:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para consultar los resúmenes de este trabajador."
        )

    return db.query(ResumenesJornada).options(
        joinedload(ResumenesJornada.empresa),
        joinedload(ResumenesJornada.trabajador)
    ).filter(
        ResumenesJornada.trabajador_id == id_trabajador
    ).order_by(ResumenesJornada.fecha.desc()).all()


@router.get("/empresa/{id_empresa}/fecha/{fecha_dia}", response_model=List[ResumenJornadaResponse], summary="Obtener cuadro de mandos diario de empresa")
@limiter.limit("60/minute") # Limita las consultas masivas del cuadro de mandos para proteger la base de datos
def obtener_cuadro_mandos_diario_empresa(
    request: Request,
    id_empresa: UUID, 
    fecha_dia: date, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **GET /api/resumenes-jornada/empresa/{id_empresa}/fecha/AAAA-MM-DD**
    
    Filtra los acumulados de la plantilla diaria validando el acceso a la empresa.
    """
    # Registrar la dirección IP del cliente y trazas de auditoría de acceso
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de cuadro de mandos diario para la empresa {id_empresa} en fecha {fecha_dia} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    if usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar el cuadro de mandos de esta empresa."
        )

    return db.query(ResumenesJornada).options(
        joinedload(ResumenesJornada.empresa),
        joinedload(ResumenesJornada.trabajador)
    ).filter(
        ResumenesJornada.empresa_id == id_empresa,
        ResumenesJornada.fecha == fecha_dia
    ).all()


@router.post("", response_model=ResumenJornadaResponse, status_code=status.HTTP_201_CREATED, summary="Crear o actualizar resumen de jornada")
@limiter.limit("20/minute") # Protegido frente a escrituras masivas y alta concurrencia en cálculos diarios
def crear_o_actualizar_resumen(
    request: Request,
    obj_in: ResumenJornadaCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **POST /api/resumenes-jornada**
    
    Registra o actualiza el cálculo acumulado diario de un operario validando permisos de tenant.
    """
    # Registrar metadatos de red y auditoría de la operación
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación/actualización de resumen diario desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    if usuario_actual.empresa_id != obj_in.empresa_id:
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
        
        resumen_con_relaciones = db.query(ResumenesJornada).options(
            joinedload(ResumenesJornada.empresa),
            joinedload(ResumenesJornada.trabajador)
        ).filter(ResumenesJornada.id == resumen.id).first()
        
        return resumen_con_relaciones
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar el cierre de jornada en el servidor: {str(error)}"
        )


@router.put("/{id_resumen}/cerrar", response_model=ResumenJornadaResponse, summary="Consolidar y cerrar jornada")
@limiter.limit("20/minute") # Protegido frente a bloqueos en lote no deseados de jornadas laborales
def consolidar_jornada_mensual(
    request: Request,
    id_resumen: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **PUT /api/resumenes-jornada/{id_resumen}/cerrar**
    
    Consolida de manera definitiva una fila diaria validando permisos de empresa o administración.
    """
    # Registrar metadatos de red y auditoría del cierre
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consolidación de la jornada {id_resumen} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    resumen = db.query(ResumenesJornada).filter(ResumenesJornada.id == id_resumen).first()
    if not resumen:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resumen diario no localizado.")

    if usuario_actual.empresa_id != resumen.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para cerrar ni consolidar la jornada de esta empresa."
        )

    setattr(resumen, "cerrado", True)
    setattr(resumen, "actualizado_en", datetime.now())
    
    try:
        db.commit()
        
        resumen_consolidado = db.query(ResumenesJornada).options(
            joinedload(ResumenesJornada.empresa),
            joinedload(ResumenesJornada.trabajador)
        ).filter(ResumenesJornada.id == id_resumen).first()
        
        return resumen_consolidado
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al consolidar la jornada: {str(error)}"
        )