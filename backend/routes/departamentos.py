from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session, joinedload

from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum, AccionPermisoEnum, TipoPermisoEnum
from core.security import (
    get_db_with_advanced_security,
    verificar_permisos_requeridos,
)
from models.departamentos import Departamentos
from models.empresas import Empresas
from models.usuarios import Usuarios
from schemas.departamentos import (
    DepartamentoCreate,
    DepartamentoResponse,
    DepartamentoUpdate,
)

# APIRouter agrupa todos los endpoints relacionados con la gestión de departamentos bajo el prefijo "/api/departamentos".
router = APIRouter(prefix="/api/departamentos", tags=["Departamentos"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "/empresa/{id_empresa}",
    response_model=List[DepartamentoResponse],
    summary="Obtener departamentos por empresa",
    description="Obtiene los departamentos de una empresa.",
)
@limiter.limit("60/minute")
def obtener_departamentos_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.CONTRATOS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/departamentos/empresa/{id_empresa}**

    Obtiene los departamentos de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de departamentos para la empresa ({id_empresa}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    resultados = (
        db.query(Departamentos).options(joinedload(Departamentos.empresa))
        .filter(Departamentos.empresa_id == id_empresa, Departamentos.activo.is_(True))
        .all()
    )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "departamentos",
            'accion': "consultar_empresa",
        },
        trabajador_id=None
    )
    db.commit()

    return resultados


@router.get(
    "/{id_departamento}",
    response_model=DepartamentoResponse,
    summary="Obtener departamento por id",
    description="Obtiene un departamento mediante su id.",
)
@limiter.limit("60/minute")
def obtener_departamento_id(
    request: Request,
    id_departamento: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.DEPARTAMENTOS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/departamentos/{id_departamento}**

    Obtiene un departamento mediante su id.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle del departamento ({id_departamento}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    departamento = (
        db.query(Departamentos).options(joinedload(Departamentos.empresa))
        .filter(Departamentos.id == id_departamento)
        .first()
    )

    if not departamento:
        print(f"Departamento ({id_departamento}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Departamento no encontrado."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=departamento.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': "departamentos",
            'accion': "consultar",
        },
        trabajador_id=None
    )
    db.commit()

    return departamento
@router.post(
    "",
    response_model=DepartamentoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear departamento",
    description="Crea un nuevo departamento dentro de una empresa.",
)
@limiter.limit("20/minute")
def crear_departamento(
    request: Request,
    payload: DepartamentoCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR+"-"+TipoPermisoEnum.DEPARTAMENTOS])),
    db: Session = Depends(get_db_with_advanced_security)):
    """
    **POST /api/departamentos**

    Crea un nuevo departamento dentro de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de departamento desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == payload.empresa_id).first()
    if not empresa:
        print(f"Empresa ({payload.empresa_id}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID ({payload.empresa_id}) no encontrada."
        )

    try:
        nuevo_departamento = Departamentos(
            empresa_id=payload.empresa_id,
            nombre=payload.nombre,
        )

        db.add(nuevo_departamento)
        db.commit()

        departamento_creado = (
            db.query(Departamentos).options(joinedload(Departamentos.empresa))
            .filter(Departamentos.id == nuevo_departamento.id)
            .first()
        )

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=payload.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': "departamentos",
                'accion': "crear",
            },
            trabajador_id=None
        )
        db.commit()

        return departamento_creado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear el departamento: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido crear el departamento."
        )

@router.put(
    "/{id_departamento}/desactivar",
    status_code=status.HTTP_200_OK,
    summary="Desactivar departamento",
    description="Desactivar un departamento.",
)
@limiter.limit("20/minute")
def desactivar_departamento(
    request: Request,
    id_departamento: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.DEPARTAMENTOS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/departamentos/{id_departamento}/desactivar**

    Desactivar un departamento.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de desactivación del departamento ({id_departamento}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    departamento = db.query(Departamentos).filter(Departamentos.id == id_departamento).first()
    if not departamento:
        print(f"Departamento ({id_departamento}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Departamento no encontrado."
        )

    setattr(departamento, 'activo', False)
    setattr(departamento, 'updated_at', datetime.now())

    try:
        db.commit()

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=departamento.empresa_id,
            accion=AccionAuditoriaEnum.ELIMINACION,
            detalle={
                'recurso': "departamentos",
                'accion': "desactivar",
            },
            trabajador_id=None
        )
        db.commit()

        print(f"Departamento ({id_departamento}) desactivado correctamente y enviado a la papelera.")
        return {"detail": "Departamento desactivado correctamente y enviado a la papelera."}
    except Exception as e:
        db.rollback()
        print(f"No se ha podido desactivar el departamento: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido desactivar el departamento."
        )

@router.put(
    "/{id_departamento}",
    response_model=DepartamentoResponse,
    summary="Modificar departamento",
    description="Modifica los datos de un departamento.",
)
@limiter.limit("20/minute")
def modificar_departamento(
    request: Request,
    id_departamento: UUID,
    payload: DepartamentoUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.DEPARTAMENTOS])),
    db: Session = Depends(get_db_with_advanced_security)):
    """
    **PUT /api/departamentos/{id_departamento}**

    Modifica los datos de un departamento.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación del departamento ({id_departamento}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    departamento = (
        db.query(Departamentos).options(joinedload(Departamentos.empresa))
        .filter(Departamentos.id == id_departamento)
        .first()
    )

    if not departamento:
        print(f"Departamento ({id_departamento}) no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Departamento no encontrado."
        )

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(departamento, key, value)
    setattr(departamento, 'updated_at', datetime.now())

    try:
        db.commit()

        departamento_actualizado = (
            db.query(Departamentos).options(joinedload(Departamentos.empresa))
            .filter(Departamentos.id == id_departamento)
            .first()
        )

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=departamento.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                'recurso': "departamentos",
                'accion': "modificar",
            },
            trabajador_id=None
        )
        db.commit()

        return departamento_actualizado
    except Exception as e:
        db.rollback()
        print(f"No se ha podido actualizar el departamento: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido actualizar el departamento."
        )

