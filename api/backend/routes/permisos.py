from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.permisos import Permisos
from models.usuarios import Usuarios
from schemas.permisos import PermisoCreate, PermisoResponse
from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum

# Configuración del enrutador para la gestión de permisos del sistema y control de acceso
router = APIRouter(prefix="/api/permisos", tags=["Permisos del Sistema"])

# Configuración del limitador de tasa de peticiones por IP para prevenir abusos y ataques de denegación
limiter = Limiter(key_func=get_remote_address)


@router.get("", response_model=List[PermisoResponse], summary="Obtener todos los permisos")
@limiter.limit("60/minute") 
def obtener_todos_los_permisos(
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/permisos**
    
    Obtiene la lista completa de permisos del sistema disponibles.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de permisos desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La cuenta de usuario se encuentra inactiva.")

    resultados = db.query(Permisos).all()

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=usuario_actual.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "permisos", "accion": "obtener_todos", "entidad_id": None, "detalles": "Se consultó la lista completa de permisos del sistema"}
    )
    db.commit()

    return resultados


@router.post("", response_model=PermisoResponse, status_code=status.HTTP_201_CREATED, summary="Crear permiso de seguridad")
@limiter.limit("10/minute") 
def crear_permiso_seguridad(
    request: Request,
    obj_in: PermisoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.ADMIN_GESTORIA]))
):
    """
    **POST /api/permisos**
    
    Registra un nuevo permiso de seguridad en el sistema validando privilegios administrativos.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de permiso desde la IP: {cliente_ip} por el administrador: {usuario_actual.email}")

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
            usuario=usuario_actual,
            empresa_id=usuario_actual.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "permisos", "accion": "crear_permiso", "entidad_id": str(nuevo_permiso.id) if hasattr(nuevo_permiso, "id") else None, "detalles": f"Se ha registrado un nuevo permiso con código '{obj_in.codigo}'"}
        )

        db.commit()
        db.refresh(nuevo_permiso)
        return nuevo_permiso
    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido guardar el permiso: {str(error)}"
        )