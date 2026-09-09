from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
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

# APIRouter agrupa todos los endpoints relacionados con la gestión de departamentos bajo el prefijo "/api/departamentos".
router = APIRouter(prefix="/api/departamentos", tags=["Departamentos"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
# Esto previene ataques de fuerza bruta o saturación de peticiones en rutas críticas.
limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=DepartamentoResponse, status_code=status.HTTP_201_CREATED, summary="Crear departamento")
@limiter.limit("20/minute")  # Protegido frente a la creación masiva o automatizada de departamentos
def crear_departamento(
    request: Request,
    obj_in: DepartamentoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **POST /api/departamentos**
    
    Registra un nuevo departamento dentro de una empresa cliente.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de departamento desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para crear departamentos en esta empresa."
        )

    try:
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Empresa con ID ({obj_in.empresa_id}) no encontrada."
            )

        if obj_in.centro_trabajo_id:
            centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == obj_in.centro_trabajo_id).first()
            if not centro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Centro de trabajo con ID ({obj_in.centro_trabajo_id}) no encontrado."
                )

        nuevo_departamento = Departamentos(
            empresa_id=obj_in.empresa_id,
            nombre=obj_in.nombre,
            centro_trabajo_id=obj_in.centro_trabajo_id
        )
        
        db.add(nuevo_departamento)
        db.commit()
        
        departamento_creado = db.query(Departamentos).options(
            joinedload(Departamentos.empresa),
            joinedload(Departamentos.centro_trabajo)
        ).filter(Departamentos.id == nuevo_departamento.id).first()
        
        return departamento_creado

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al crear el departamento: {str(error)}"
        )

@router.put("/{id_departamento}", response_model=DepartamentoResponse, summary="Editar departamento")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def editar_departamento(
    request: Request,
    id_departamento: UUID, 
    obj_in: DepartamentoUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **PUT /api/departamentos/{id_departamento}**
    
    Actualiza los campos permitidos de un departamento.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de edición del departamento {id_departamento} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    departamento = db.query(Departamentos).options(
        joinedload(Departamentos.empresa),
        joinedload(Departamentos.centro_trabajo)
    ).filter(Departamentos.id == id_departamento).first()
    
    if not departamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Departamento con ID ({id_departamento}) no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != departamento.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para editar este departamento."
        )

    update_data = obj_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(departamento, key, value)
    
    departamento.updated_at = datetime.now()
    
    try:
        db.commit()
        
        departamento_actualizado = db.query(Departamentos).options(
            joinedload(Departamentos.empresa),
            joinedload(Departamentos.centro_trabajo)
        ).filter(Departamentos.id == id_departamento).first()
        
        return departamento_actualizado
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el departamento: {str(error)}"
        )


@router.delete("/{id_departamento}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar departamento")
@limiter.limit("20/minute")  # Limita este endpoint a un máximo de 20 peticiones por minuto por IP
def eliminar_departamento(
    request: Request,
    id_departamento: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **DELETE /api/departamentos/{id_departamento}**
    
    Elimina físicamente un departamento previa validación de contratos activos.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de eliminación del departamento {id_departamento} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    departamento = db.query(Departamentos).filter(Departamentos.id == id_departamento).first()
    if not departamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Departamento con ID ({id_departamento}) no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != departamento.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para eliminar este departamento."
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
            detail=f"No se puede eliminar el departamento porque tiene registros asociados históricos."
        )

@router.get("/empresa/{id_empresa}", response_model=List[DepartamentoResponse], summary="Obtener departamentos por empresa")
@limiter.limit("60/minute")  # Limita las consultas masivas de listados de departamentos por empresa
def obtener_departamentos_empresa(
    request: Request,
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/departamentos/empresa/{id_empresa}**
    
    Recupera los departamentos de una organización específica.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de departamentos para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes autorización para consultar los departamentos de esta empresa."
        )

    return (
        db.query(Departamentos)
        .options(
            joinedload(Departamentos.empresa),
            joinedload(Departamentos.centro_trabajo)
        )
        .filter(Departamentos.empresa_id == id_empresa)
        .all()
    )


@router.get("/{id_departamento}", response_model=DepartamentoResponse, summary="Obtener departamento por ID")
@limiter.limit("60/minute")  # Limita las consultas de detalles de un departamento específico
def obtener_departamento(
    request: Request,
    id_departamento: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/departamentos/{id_departamento}**
    
    Busca la información de un departamento mediante su ID.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle del departamento {id_departamento} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    departamento = db.query(Departamentos).options(
        joinedload(Departamentos.empresa),
        joinedload(Departamentos.centro_trabajo)
    ).filter(Departamentos.id == id_departamento).first()
    
    if not departamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Departamento con ID ({id_departamento}) no encontrado."
        )

    if usuario_actual.empresa_id and usuario_actual.empresa_id != departamento.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes autorización para consultar este departamento."
        )

    return departamento