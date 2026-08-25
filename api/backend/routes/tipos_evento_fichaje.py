from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from schemas.tipos_evento_fichaje import TipoEventoFichajeCreate, TipoEventoFichajeResponse
from models.tipos_evento_fichaje import TiposEventoFichaje
from models.usuarios import Usuarios

router = APIRouter(prefix="/api/tipos-evento-fichaje", tags=["Tipos de Evento de Fichaje"])

limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=TipoEventoFichajeResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def crear_tipo_evento_fichaje(
    request: Request,
    obj_in: TipoEventoFichajeCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    URI: POST /api/tipos-evento-fichaje
    Registra una nueva categoría de marcaje horario en el catálogo.
    Exclusivo para administradores mediante la tabla de roles relacionales.
    """
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
            computa_como_trabajo=obj_in.computa_como_trabajo
        )
        
        db.add(nuevo_evento)
        db.commit()
        db.refresh(nuevo_evento)
        return nuevo_evento

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error de integridad al guardar el tipo de evento: {str(error)}"
        )

@router.put("/{id_tipo_evento}", response_model=TipoEventoFichajeResponse)
def actualizar_tipo_evento_fichaje(
    id_tipo_evento: str,
    obj_in: TipoEventoFichajeCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
        URI: PUT /api/tipos-evento-fichaje/{id_tipo_evento}
        Actualiza una categoría de marcaje horario en el catálogo.
        Exclusivo para administradores mediante la tabla de roles relacionales.
        """
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

        db.commit()
        db.refresh(evento)
        return evento

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el tipo de evento: {str(error)}"
        )

@router.delete("/{id_tipo_evento}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_tipo_evento_fichaje(
    id_tipo_evento: str,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
            URI: DELETE /api/tipos-evento-fichaje/{id_tipo_evento}
            Elimina una categoría de marcaje horario del catálogo.
            Exclusivo para administradores mediante la tabla de roles relacionales.
            """
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


@router.get("/{id_tipo_evento}", response_model=TipoEventoFichajeResponse)
def obtener_tipo_evento_por_id(
    id_tipo_evento: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
                URI: GET /api/tipos-evento-fichaje/{id_tipo_evento}
                Obtiene una categoría de marcaje horario del catálogo por su id.
                """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    evento = db.query(TiposEventoFichaje).filter(TiposEventoFichaje.id == id_tipo_evento).first()
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tipo de evento con ID {id_tipo_evento} no localizado en el catálogo maestro."
        )
    return evento


@router.get("/codigo/{codigo_clave}", response_model=TipoEventoFichajeResponse)
def obtener_tipo_evento_por_codigo(
    codigo_clave: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
                    URI: GET /api/tipos-evento-fichaje/codigo/{codigo_clave}
                    Obtiene una categoría de marcaje horario del catálogo por su código.
                    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    evento = db.query(TiposEventoFichaje).filter(
        TiposEventoFichaje.codigo == codigo_clave.strip().upper()
    ).first()
    
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna regla de fichaje bajo el código '{codigo_clave}'."
        )
    return evento

@router.get("/empresa/{empresa_id}", response_model=List[TipoEventoFichajeResponse])
def obtener_tipos_de_evento_empresa(
    empresa_id: str,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
                    URI: GET /api/tipos-evento-fichaje/empresa/{empresa_id}
                    Obtiene las categorías de marcaje horario del catálogo por de una empresa por su id.
                    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    return db.query(TiposEventoFichaje).filter(TiposEventoFichaje.empresa_id == empresa_id).all()
