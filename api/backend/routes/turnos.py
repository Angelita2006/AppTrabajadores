from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.database import get_db
from core.security import obtener_usuario_actual
from models.empresas import Empresas
from schemas.turnos import TurnoCreate, TurnoResponse, TurnoUpdate
from models.turnos import Turnos
from models.usuarios import Usuarios

router = APIRouter(prefix="/api/turnos", tags=["Turnos Laborales"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=TurnoResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")  # Protegido frente a la creación masiva o automatizada de turnos
def crear_turno_laboral(
    request: Request,
    obj_in: TurnoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/turnos
    Registra un nuevo cuadrante de turno teórico validando empresa y permisos.
    """
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear turnos en esta empresa."
        )

    try:
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
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
        db.commit()
        db.refresh(nuevo_turno)
        return nuevo_turno

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al guardar el turno laboral: {str(error)}"
        )


@router.get("", response_model=List[TurnoResponse])
def obtener_todos_los_turnos(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/turnos
    Devuelve el catálogo de turnos. Si es admin global ve todo; si es de empresa, filtra por su tenant.
    """
    query = db.query(Turnos).join(Turnos.empresa)
    
    if usuario_actual.tipo_usuario != "Administrador":
        if not usuario_actual.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No estás vinculado a ninguna empresa."
            )
        query = query.filter(Turnos.empresa_id == usuario_actual.empresa_id)

    return query.order_by(Empresas.nombre_comercial.asc(), Turnos.nombre.asc()).all()


@router.get("/empresa/{id_empresa}", response_model=List[TurnoResponse])
def obtener_turnos_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/turnos/empresa/{id_empresa}
    Recupera los cuadrantes horarios de una empresa específica aplicando aislamiento multi-tenant.
    """
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los turnos de esta empresa."
        )

    return db.query(Turnos).filter(Turnos.empresa_id == id_empresa).order_by(Turnos.nombre.asc()).all()


@router.get("/{id_turno}", response_model=TurnoResponse)
def obtener_turno_laboral(
    id_turno: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/turnos/{id_turno}
    Busca un turno específico validando que pertenezca al ámbito del usuario.
    """
    turno = db.query(Turnos).filter(Turnos.id == id_turno).first()
    if not turno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turno laboral con ID {id_turno} no localizado en el catálogo."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != turno.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver este turno."
        )

    return turno


@router.put("/{id_turno}/editar", response_model=TurnoResponse)
@limiter.limit("20/minute")  # Protegido frente a modificaciones masivas concurrentes
def editar_turno(
    request: Request,
    id_turno: UUID, 
    obj_in: TurnoUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: PUT /api/turnos/{id_turno}/editar
    Modifica un turno validando la pertenencia a la empresa o rol de administrador.
    """
    turno = db.query(Turnos).filter(Turnos.id == id_turno).first()
    
    if not turno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ningún turno con el ID {id_turno}."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != turno.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar este turno."
        )
    
    update_data = obj_in.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        if hasattr(turno, key):
            setattr(turno, key, value)
    
    db.commit()
    db.refresh(turno)
    return turno


@router.delete("/{id_turno}", status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")  # Protegido frente a eliminaciones masivas de turnos
def eliminar_turno_maestro(
    request: Request,
    id_turno: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: DELETE /api/turnos/{id_turno}
    Elimina físicamente un turno validando permisos de administración o empresa.
    """
    turno = db.query(Turnos).filter(Turnos.id == id_turno).first()
    if not turno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turno laboral con ID {id_turno} no localizado."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != turno.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar este turno."
        )
    
    db.delete(turno)
    db.commit()
    return {"detail": f"Turno ({id_turno}) eliminado correctamente junto con su planificación en cascada."}