from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.contratos import Contratos
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from models.usuarios import Usuarios
from models.centros_trabajo import CentrosTrabajo
from models.departamentos import Departamentos
from schemas.departamentos import DepartamentoCreate, DepartamentoResponse, DepartamentoUpdate

router = APIRouter(prefix="/api/departamentos", tags=["Departamentos"])

limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=DepartamentoResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")  # Protegido frente a la creación masiva o automatizada de departamentos
def crear_departamento(
    request: Request,
    obj_in: DepartamentoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: POST /api/departamentos
    Registra un nuevo departamento dentro de una empresa cliente.
    """
    if usuario_actual.empresa_id and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear departamentos en esta empresa."
        )

    try:
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
            )

        if obj_in.centro_trabajo_id:
            centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == obj_in.centro_trabajo_id).first()
            if not centro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Centro de trabajo ({obj_in.centro_trabajo_id}) no encontrado."
                )

        nuevo_departamento = Departamentos(
            empresa_id=obj_in.empresa_id,
            nombre=obj_in.nombre,
            centro_trabajo_id=obj_in.centro_trabajo_id
        )
        
        db.add(nuevo_departamento)
        db.commit()
        db.refresh(nuevo_departamento)
        return nuevo_departamento

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al crear el departamento: {str(error)}"
        )


@router.get("", response_model=List[DepartamentoResponse])
def obtener_todos_los_departamentos(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/departamentos
    Devuelve los departamentos aplicando el filtro de empresa si el usuario está asociado a una.
    """
    query = db.query(Departamentos).join(Departamentos.empresa)
    
    # Si el usuario tiene una empresa asignada (no es global/gestoría), filtramos por su tenant
    if usuario_actual.empresa_id:
        query = query.filter(Departamentos.empresa_id == usuario_actual.empresa_id)

    return query.order_by(Empresas.nombre_comercial.asc()).order_by(Departamentos.nombre.asc()).all()


@router.get("/empresa/{id_empresa}", response_model=List[DepartamentoResponse])
def obtener_departamentos_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/departamentos/empresa/{id_empresa}
    Recupera los departamentos de una organización específica.
    """
    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los departamentos de esta empresa."
        )

    return db.query(Departamentos).filter(Departamentos.empresa_id == id_empresa).all()


@router.get("/{id_departamento}", response_model=DepartamentoResponse)
def obtener_departamento(
    id_departamento: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/departamentos/{id_departamento}
    Busca la información de un departamento mediante su ID.
    """
    departamento = db.query(Departamentos).filter(Departamentos.id == id_departamento).first()
    if not departamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Departamento con ID {id_departamento} no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != departamento.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar este departamento."
        )

    return departamento


@router.put("/{id_departamento}", response_model=DepartamentoResponse)
def actualizar_departamento(
    id_departamento: UUID, 
    nuevo_nombre: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: PUT /api/departamentos/{id_departamento}
    Modifica el nombre de un departamento existente.
    """
    departamento = db.query(Departamentos).filter(Departamentos.id == id_departamento).first()
    if not departamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Departamento con ID {id_departamento} no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != departamento.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar este departamento."
        )

    setattr(departamento, "nombre", nuevo_nombre)
    setattr(departamento, "updated_at", datetime.now())
    
    db.commit()
    db.refresh(departamento)
    return departamento


@router.put("/{id_departamento}/editar", response_model=DepartamentoResponse)
def editar_departamento(
    id_departamento: UUID, 
    obj_in: DepartamentoUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: PUT /api/departamentos/{id_departamento}/editar
    Actualiza los campos permitidos de un departamento.
    """
    departamento = db.query(Departamentos).filter(Departamentos.id == id_departamento).first()
    if not departamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Departamento con ID {id_departamento} no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != departamento.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para editar este departamento."
        )

    update_data = obj_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(departamento, key, value)
    
    departamento.updated_at = datetime.now()
    
    db.commit()
    db.refresh(departamento)
    return departamento


@router.delete("/{id_departamento}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_departamento(
    id_departamento: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: DELETE /api/departamentos/{id_departamento}
    Elimina físicamente un departamento previa validación de contratos activos.
    """
    departamento = db.query(Departamentos).filter(Departamentos.id == id_departamento).first()
    if not departamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Departamento con ID {id_departamento} no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != departamento.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar este departamento."
        )

    contratos_activos = db.query(Contratos).filter(
        Contratos.departamento_id == id_departamento,
        Contratos.activo == True
    ).count()

    if contratos_activos > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Acción bloqueada: No se puede eliminar el departamento porque tiene {contratos_activos} contrato(s) activo(s) asociado(s). Debe reasignarlos o rescindirlos primero."
        )

    try:
        db.delete(departamento)
        db.commit()
        return
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el departamento porque tiene registros asociados históricos. Error: {str(error)}"
        )