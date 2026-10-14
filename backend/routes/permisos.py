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
)
@limiter.limit("60/minute")
def obtener_todos_los_permisos(
    request: Request,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.PERMISOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **GET /api/permisos**

    Obtiene la lista completa de permisos del sistema disponibles.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de permisos desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La cuenta de usuario se encuentra inactiva.")

    resultados = db.query(Permisos).all()

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=request.headers.get('Empresa-ID'),
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={'recurso': 'permisos', 'accion': 'obtener_todos', 'entidad_id': None, 'detalles': 'Se consultó la lista completa de permisos del sistema'},
        trabajador_id=None,
    )
    db.commit()

    return resultados

@router.post(
    '',
    response_model=PermisoSimpleResponse,
    status_code=status.HTTP_201_CREATED,
    summary='Crear permiso de seguridad',
)
@limiter.limit("10/minute")
def crear_permiso_seguridad(
    request: Request,
    obj_in: PermisoCreate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.PERMISOS])),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **POST /api/permisos**

    Registra un nuevo permiso de seguridad en el sistema validando privilegios administrativos.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de permiso desde la IP ({cliente_ip}) por el administrador: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La cuenta de usuario se encuentra inactiva.")

    try:
        permiso_existente = db.query(Permisos).filter(Permisos.codigo == obj_in.codigo).first()
        if permiso_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un permiso registrado con el código '{obj_in.codigo}'."
            )

        nuevo_permiso = Permisos(codigo=obj_in.codigo, descripcion=obj_in.descripcion)
        db.add(nuevo_permiso)

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=request.headers.get('Empresa-ID'),
            accion=AccionAuditoriaEnum.CREACION,
            detalle={'recurso': 'permisos', 'accion': 'crear_permiso', 'entidad_id': str(nuevo_permiso.id) if hasattr(nuevo_permiso, 'id') else None, 'detalles': f"Se ha registrado un nuevo permiso con código '{obj_in.codigo}'"},
            trabajador_id=None,
        )

        db.commit()
        db.refresh(nuevo_permiso)
        return nuevo_permiso
    except HTTPException as http_error:
        raise http_error
    except Exception as e:
        db.rollback()
        print(f"Error al ejecutar crear_permiso_seguridad: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No se ha podido guardar el permiso'
        )
