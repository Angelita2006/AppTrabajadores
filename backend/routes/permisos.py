from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum, AccionPermisoEnum, TipoPermisoEnum
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from models.permisos import Permisos
from models.usuarios import Usuarios
from schemas.permisos import PermisoCreate, PermisoSimpleResponse

# APIRouter agrupa todos los endpoints relacionados con la gestión de permisos bajo el prefijo "/api/permisos".
router = APIRouter(prefix="/api/permisos", tags=["Permisos del Sistema"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.get(
    '',
    response_model=List[PermisoSimpleResponse],
    summary='Obtener todos los permisos',
    description="Obtiene todos los permisos del sistema disponibles.",
)
@limiter.limit("60/minute")
def obtener__permisos(
    request: Request,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.PERMISOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/permisos**

    Obtiene todos los permisos del sistema disponibles.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de permisos desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    if not usuario_actual.activo:
        print("La cuenta de usuario se encuentra inactiva.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La cuenta de usuario se encuentra inactiva.")

    resultados = db.query(Permisos).all()

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=request.headers.get('Empresa-ID'),
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={
            'recurso': 'permisos',
            'accion': 'obtener_todos',
        },
        trabajador_id=None,
    )
    db.commit()

    return resultados

@router.post(
    '',
    response_model=PermisoSimpleResponse,
    status_code=status.HTTP_201_CREATED,
    summary='Crear permiso',
    description="Crea un nuevo permiso.",
)
@limiter.limit("10/minute")
def crear_permiso(
    request: Request,
    payload: PermisoCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.PERMISOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/permisos**

    Crea un nuevo permiso.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de permiso desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    if not usuario_actual.activo:
        print("La cuenta de usuario se encuentra inactiva.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La cuenta de usuario se encuentra inactiva.")

    try:
        permiso_existente = db.query(Permisos).filter(Permisos.tipo == payload.tipo, Permisos.accion == payload.accion).first()
        if permiso_existente:
            print(f"Ya existe un permiso registrado con el tipo '{payload.tipo}' y la acción ({payload.accion}).")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un permiso registrado con esa combinación de tipo y acción."
            )

        nuevo_permiso = Permisos(tipo=payload.tipo, accion=payload.accion, descripcion=payload.descripcion)
        db.add(nuevo_permiso)

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=request.headers.get('Empresa-ID'),
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': 'permisos',
                'accion': 'crear',
            },
            trabajador_id=None,
        )

        db.commit()
        db.refresh(nuevo_permiso)

        return nuevo_permiso
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear el permiso: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido crear el permiso.'
        )
