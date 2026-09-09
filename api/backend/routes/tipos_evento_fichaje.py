from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from schemas.tipos_evento_fichaje import TipoEventoFichajeCreate, TipoEventoFichajeResponse
from models.tipos_evento_fichaje import TiposEventoFichaje
from models.usuarios import Usuarios

# Configuración del enrutador para la gestión del catálogo de tipos de evento de fichaje
router = APIRouter(prefix="/api/tipos-evento-fichaje", tags=["Tipos de Evento de Fichaje"])

# Configuración del limitador de tasa de peticiones por IP para prevenir abusos y ataques de denegación
limiter = Limiter(key_func=get_remote_address)


@router.get("/empresa/{empresa_id}", response_model=List[TipoEventoFichajeResponse], summary="Obtener tipos de evento por empresa")
@limiter.limit("60/minute") # Limita las consultas masivas de listados para proteger el rendimiento de la base de datos
def obtener_tipos_de_evento_empresa(
    request: Request,
    empresa_id: UUID,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/tipos-evento-fichaje/empresa/{empresa_id}**
    
    Obtiene las categorías de marcaje horario configuradas para una empresa específica validando permisos.
    """
    # Registrar la dirección IP del cliente y trazas de auditoría de acceso
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de eventos para la empresa {empresa_id} desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    # Validar aislamiento multi-tenant
    if usuario_actual.empresa_id and usuario_actual.empresa_id != empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para ver los eventos de esta empresa."
        )

    return db.query(TiposEventoFichaje).options(
        joinedload(TiposEventoFichaje.empresa)
    ).filter(TiposEventoFichaje.empresa_id == empresa_id).all()


@router.get("/codigo/{codigo_clave}", response_model=TipoEventoFichajeResponse, summary="Obtener tipo de evento por código")
@limiter.limit("60/minute") # Limita las consultas individuales por código para prevenir ataques de enumeración
def obtener_tipo_evento_por_codigo(
    request: Request,
    codigo_clave: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/tipos-evento-fichaje/codigo/{codigo_clave}**
    
    Obtiene una categoría de marcaje horario del catálogo por su código textual normalizado.
    """
    # Registrar la dirección IP del cliente y trazas de auditoría
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de búsqueda por código '{codigo_clave}' desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    evento = db.query(TiposEventoFichaje).options(
        joinedload(TiposEventoFichaje.empresa)
    ).filter(
        TiposEventoFichaje.codigo == codigo_clave.strip().upper()
    ).first()
    
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna regla de fichaje bajo el código '{codigo_clave}'."
        )
    return evento


@router.get("/{id_tipo_evento}", response_model=TipoEventoFichajeResponse, summary="Obtener tipo de evento por ID")
@limiter.limit("60/minute") # Limita las consultas individuales de detalles de eventos
def obtener_tipo_evento_por_id(
    request: Request,
    id_tipo_evento: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/tipos-evento-fichaje/{id_tipo_evento}**
    
    Obtiene una categoría de marcaje horario del catálogo por su identificador único.
    """
    # Registrar la dirección IP del cliente y trazas de auditoría
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle del tipo de evento {id_tipo_evento} desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    evento = db.query(TiposEventoFichaje).options(
        joinedload(TiposEventoFichaje.empresa)
    ).filter(TiposEventoFichaje.id == id_tipo_evento).first()
    
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tipo de evento con ID {id_tipo_evento} no localizado en el catálogo maestro."
        )
    return evento


@router.post("", response_model=TipoEventoFichajeResponse, status_code=status.HTTP_201_CREATED, summary="Crear tipo de evento de fichaje")
@limiter.limit("10/minute") # Protegido frente a la creación masiva o automatizada de reglas de marcaje
def crear_tipo_evento_fichaje(
    request: Request,
    obj_in: TipoEventoFichajeCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **POST /api/tipos-evento-fichaje**
    
    Registra una nueva categoría de marcaje horario en el catálogo validando privilegios administrativos.
    """
    # Registrar metadatos de red y auditoría de la creación
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de tipo de evento desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    try:
        codigo_normalizado = obj_in.codigo.strip().upper()
        evento_existente = db.query(TiposEventoFichaje).filter(
            TiposEventoFichaje.codigo == codigo_normalizado
        ).first()
        
        if evento_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una categoría registrada bajo el código maestro '{codigo_normalizado}'."
            )

        nuevo_evento = TiposEventoFichaje(
            codigo=codigo_normalizado,
            descripcion=obj_in.descripcion,
            computa_como_trabajo=obj_in.computa_como_trabajo,
            empresa_id=obj_in.empresa_id
        )
        
        db.add(nuevo_evento)
        db.commit()
        
        evento_con_relacion = db.query(TiposEventoFichaje).options(
            joinedload(TiposEventoFichaje.empresa)
        ).filter(TiposEventoFichaje.id == nuevo_evento.id).first()
        
        return evento_con_relacion

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error de integridad al guardar el tipo de evento: {str(error)}"
        )


@router.put("/{id_tipo_evento}", response_model=TipoEventoFichajeResponse, summary="Actualizar tipo de evento de fichaje")
@limiter.limit("20/minute") # Protegido frente a actualizaciones masivas concurrentes
def actualizar_tipo_evento_fichaje(
    request: Request,
    id_tipo_evento: UUID,
    obj_in: TipoEventoFichajeCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/tipos-evento-fichaje/{id_tipo_evento}**
    
    Actualiza una categoría de marcaje horario existente en el catálogo.
    """
    # Registrar metadatos de red y auditoría de la actualización
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de actualización del tipo de evento {id_tipo_evento} desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    evento = db.query(TiposEventoFichaje).filter(TiposEventoFichaje.id == id_tipo_evento).first()
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tipo de evento con ID {id_tipo_evento} no localizado."
        )

    try:
        codigo_normalizado = obj_in.codigo.strip().upper()
        
        evento_existente = db.query(TiposEventoFichaje).filter(
            TiposEventoFichaje.codigo == codigo_normalizado,
            TiposEventoFichaje.id != id_tipo_evento
        ).first()
        
        if evento_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otra categoría registrada bajo el código maestro '{codigo_normalizado}'."
            )

        evento.codigo = codigo_normalizado
        evento.descripcion = obj_in.descripcion
        evento.computa_como_trabajo = obj_in.computa_como_trabajo
        if hasattr(obj_in, "empresa_id") and obj_in.empresa_id is not None:
            evento.empresa_id = obj_in.empresa_id

        db.commit()
        
        evento_actualizado = db.query(TiposEventoFichaje).options(
            joinedload(TiposEventoFichaje.empresa)
        ).filter(TiposEventoFichaje.id == id_tipo_evento).first()
        
        return evento_actualizado

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el tipo de evento: {str(error)}"
        )


@router.delete("/{id_tipo_evento}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar tipo de evento de fichaje")
@limiter.limit("20/minute") # Protegido frente a eliminaciones masivas destructivas
def eliminar_tipo_evento_fichaje(
    request: Request,
    id_tipo_evento: UUID,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **DELETE /api/tipos-evento-fichaje/{id_tipo_evento}**
    
    Elimina una categoría de marcaje horario del catálogo validando restricciones de integridad referencial.
    """
    # Registrar metadatos de red y auditoría de la eliminación
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de eliminación del tipo de evento {id_tipo_evento} desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    evento = db.query(TiposEventoFichaje).filter(TiposEventoFichaje.id == id_tipo_evento).first()
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tipo de evento con ID {id_tipo_evento} no localizado."
        )

    try:
        db.delete(evento)
        db.commit()
        return None
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el tipo de evento porque está asociado a registros de fichaje: {str(error)}"
        )