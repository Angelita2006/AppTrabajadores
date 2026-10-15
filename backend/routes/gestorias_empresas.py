from datetime import date, datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload, Session

from core.auditoria import registrar_auditoria
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    AlcancePermisoEnum,
    TipoPermisoEnum,
    TipoRolEnum,
)
from core.security import get_db_with_advanced_security, verificar_permisos_requeridos
from models.empresas import Empresas
from models.gestorias_empresas import GestoriasEmpresas
from models.permisos import Permisos
from models.roles import Roles
from models.usuarios import Usuarios
from models.usuarios_empresas import UsuariosEmpresas
from schemas.gestorias_empresas import (
    GestoriaEmpresaCreate,
    GestoriaEmpresaPermisosUpdate,
    GestoriaEmpresaSimpleResponse,
    GestoriaEmpresaUpdate,
)

# APIRouter agrupa todos los endpoints relacionados con las relaciones entre gestorías y empresas bajo el prefijo "/api/gestorias-empresas".
router = APIRouter(prefix="/api/gestorias-empresas", tags=["Gestorías y empresas"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

def _relacion_gestoria(db: Session, id_relacion: UUID) -> GestoriasEmpresas:
    relacion = (
        db.query(GestoriasEmpresas).options(
        joinedload(GestoriasEmpresas.empresa_gestora),
        joinedload(GestoriasEmpresas.empresa_cliente))
        .filter(GestoriasEmpresas.id == id_relacion)
        .first()
    )
    if not relacion:
        print(f"Relación ({id_relacion}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la autorización entre gestoría y empresa."
        )
    return relacion


def _es_superadmin_global(db: Session, usuario_id: UUID) -> bool:
    return (
        db.query(UsuariosEmpresas.id)
        .join(Roles, Roles.id == UsuariosEmpresas.rol_id)
        .filter(UsuariosEmpresas.usuario_id == usuario_id,
            UsuariosEmpresas.empresa_id.is_(None),
            UsuariosEmpresas.activo.is_(True),
            Roles.tipo == TipoRolEnum.SUPERADMINISTRADOR)
        .first()
        is not None
    )

@router.get(
    "",
    response_model=List[GestoriaEmpresaSimpleResponse],
    summary="Listar autorizaciones de gestoría",
    description="Lista las autorizaciones visibles para la empresa activa.",
)
@limiter.limit("60/minute")
def obtener_autorizaciones_gestorias(
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.GESTORIAS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /api/gestorias-empresas**

    Lista las autorizaciones visibles para la empresa activa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de autorizaciones de gestoría desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    empresa_id = request.headers.get("Empresa-ID")
    if empresa_id is None:
        if not _es_superadmin_global(db, usuario_actual.id):
            print("Debe seleccionar una empresa activa.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debe seleccionar una empresa activa.")
        return db.query(GestoriasEmpresas).order_by(GestoriasEmpresas.created_at.desc()).all()
    consulta = db.query(GestoriasEmpresas).filter(
        (GestoriasEmpresas.empresa_gestora_id == empresa_id)
        | (GestoriasEmpresas.empresa_cliente_id == empresa_id)
    )
    relaciones = consulta.order_by(GestoriasEmpresas.created_at.desc()).all()
    
    return relaciones

@router.get(
    "/{id_relacion}",
    response_model=GestoriaEmpresaSimpleResponse,
    summary="Obtener autorización de gestoría",
    description="Obtiene una autorización relacionada con la empresa activa.",
)
@limiter.limit("60/minute")
def obtener_autorizacion_gestoria(
    request: Request,
    id_relacion: UUID,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CONSULTAR + "-" + TipoPermisoEnum.GESTORIAS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**GET /api/gestorias-empresas/{id_relacion}**

    Obtiene una autorización relacionada con la empresa activa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de autorización de gestoría con identificador ({id_relacion}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    relacion = _relacion_gestoria(db, id_relacion)
    empresa_id = request.headers.get("Empresa-ID")
    if empresa_id not in (relacion.empresa_gestora_id, relacion.empresa_cliente_id) and not _es_superadmin_global(db, usuario_actual.id):
        print("No se encontró la autorización solicitada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No se encontró la autorización solicitada."
        )
    
    return relacion

@router.post(
    "",
    response_model=GestoriaEmpresaSimpleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Autorizar a una gestoría sobre una empresa cliente",
    description="Registra la autorización de la gestoría seleccionada sobre una empresa cliente.",
)
@limiter.limit("20/minute")
def crear_autorizacion_gestoria(
    payload: GestoriaEmpresaCreate,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.CREAR + "-" + TipoPermisoEnum.GESTORIAS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**POST /api/gestorias-empresas**

    Registra la autorización de la gestoría seleccionada sobre una empresa cliente.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de autorización de gestoría desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    gestoria_id = request.headers.get("Empresa-ID")
    gestoria = db.query(Empresas).filter(Empresas.id == gestoria_id).first()
    cliente = db.query(Empresas).filter(Empresas.id == payload.empresa_cliente_id).first()
    if not gestoria or not gestoria.es_gestoria:
        print("La empresa activa no está registrada como gestoría.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="La empresa activa no está registrada como gestoría."
        )
    if not cliente:
        print(f"Empresa cliente ({payload.empresa_cliente_id}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la empresa cliente."
        )
    if cliente.es_gestoria or cliente.id == gestoria.id:
        print("La empresa indicada no puede ser cliente de esta autorización.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="La empresa indicada no puede ser cliente de esta autorización."
        )
    if not cliente.activa:
        print("No se puede autorizar una empresa inactiva.")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="No se puede autorizar una empresa inactiva."
        )
    if payload.fecha_inicio < date.today():
        print("La fecha de inicio no puede estar en el pasado.")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail="La fecha de inicio no puede estar en el pasado."
        )

    relacion = GestoriasEmpresas(
        empresa_gestora_id=gestoria.id,
        empresa_cliente_id=cliente.id,
        usuario_creador_id=usuario_actual.id,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
        activo=True,
    )
    db.add(relacion)
    try:
        db.flush()
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=gestoria.id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={
                'recurso': 'gestorias_empresas',
                'accion': 'crear',
            },
            trabajador_id=None,
        )
        db.commit()
        
        return relacion
    except IntegrityError as e:
        db.rollback()
        print(f"Ya existe una autorización activa entre estas empresas: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Ya existe una autorización activa entre estas empresas."
        )


@router.put(
    "/{id_relacion}/permisos",
    response_model=GestoriaEmpresaSimpleResponse,
    summary="Configurar permisos delegados a una gestoría",
    description="Establece el máximo de permisos que una gestoría puede ejercer sobre una empresa cliente.",
)
@limiter.limit("20/minute")
def configurar_permisos_delegados(
    id_relacion: UUID,
    payload: GestoriaEmpresaPermisosUpdate,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.MODIFICAR
            + "-"
            + TipoPermisoEnum.GESTORIAS_EMPRESAS
            + "-"
            + AlcancePermisoEnum.GLOBAL
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**PUT /api/gestorias-empresas/{id_relacion}/permisos**

    Configura los permisos máximos delegados en la empresa cliente.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(
        f"Petición de configuración de permisos delegados ({id_relacion}) "
        f"desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}."
    )

    # Validaciones estructurales básicas
    if not _es_superadmin_global(db, usuario_actual.id):
        print("Solo el superadministrador global puede configurar la delegación de permisos.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el superadministrador global puede configurar la delegación de permisos.",
        )

    relacion = _relacion_gestoria(db, id_relacion)
    claves = list(dict.fromkeys(payload.permisos_delegados))
    permisos_disponibles = {
        f"{permiso.accion.value}-{permiso.tipo.value}-{permiso.alcance.value}": permiso
        for permiso in db.query(Permisos).all()
        if permiso.alcance != AlcancePermisoEnum.GLOBAL
    }
    desconocidos = set(claves) - permisos_disponibles.keys()
    if desconocidos:
        print("La lista contiene permisos inexistentes o globales.")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La lista contiene permisos inexistentes o globales.",
        )

    try:
        setattr(relacion, "permisos_maximos", claves)
        setattr(
            relacion,
            "permisos_delegados",
            [permiso for permiso in (relacion.permisos_delegados or []) if permiso in claves],
        )
        setattr(relacion, "updated_at", datetime.now(timezone.utc))
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=relacion.empresa_cliente_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                "recurso": "gestorias_empresas",
                "accion": "configurar_limite_permisos_gestoria",
            },
            trabajador_id=None,
        )
        db.commit()
        db.refresh(relacion)
        return relacion
    except Exception as e:
        db.rollback()
        print(f"No se han podido configurar los permisos delegados: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se han podido configurar los permisos delegados.",
        )


@router.put(
    "/{id_relacion}/permisos-delegados",
    response_model=GestoriaEmpresaSimpleResponse,
    summary="Conceder o revocar permisos de la gestoría",
    description="Permite al cliente reducir la delegación dentro del límite fijado por la plataforma.",
)
@limiter.limit("20/minute")
def actualizar_permisos_delegados_cliente(
    id_relacion: UUID,
    payload: GestoriaEmpresaPermisosUpdate,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.MODIFICAR
            + "-"
            + TipoPermisoEnum.GESTORIAS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**PUT /api/gestorias-empresas/{id_relacion}/permisos-delegados**

    Ajusta los permisos delegados sin superar el límite fijado por la plataforma.
    """
    relacion = _relacion_gestoria(db, id_relacion)
    es_superadmin = _es_superadmin_global(db, usuario_actual.id)
    empresa_contexto = request.headers.get("Empresa-ID")
    if not es_superadmin and empresa_contexto != str(relacion.empresa_cliente_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la autorización de gestoría para la empresa activa.",
        )
    if not relacion.activo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede cambiar una delegación de una autorización inactiva.",
        )

    claves = list(dict.fromkeys(payload.permisos_delegados))
    maximos = set(relacion.permisos_maximos or [])
    if not set(claves).issubset(maximos):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La delegación supera los permisos máximos fijados por el superadministrador.",
        )

    try:
        setattr(relacion, "permisos_delegados", claves)
        setattr(relacion, "updated_at", datetime.now(timezone.utc))
        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=relacion.empresa_cliente_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={
                "recurso": "gestorias_empresas",
                "accion": "actualizar_permisos_delegados_cliente",
            },
            trabajador_id=None,
        )
        db.commit()
        db.refresh(relacion)
        return relacion
    except Exception as e:
        db.rollback()
        print(f"No se han podido actualizar los permisos delegados: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se han podido actualizar los permisos delegados.",
        )
@router.patch(
    "/{id_relacion}",
    response_model=GestoriaEmpresaSimpleResponse,
    summary="Modificar autorización de gestoría",
    description="Modifica una autorización de la gestoría activa con la empresa.",
)
@limiter.limit("20/minute")
def modificar_autorizacion_gestoria(
    id_relacion: UUID,
    payload: GestoriaEmpresaUpdate,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.MODIFICAR + "-" + TipoPermisoEnum.GESTORIAS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """**PATCH /api/gestorias-empresas/{id_relacion}**

    Modifica una autorización de la gestoría activa con la empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de autorización de gestoría con identificador ({id_relacion}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    relacion = _relacion_gestoria(db, id_relacion)
    if relacion.empresa_gestora_id != request.headers.get("Empresa-ID"):
        print("No se encontró la autorización solicitada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No se encontró la autorización solicitada."
        )
    
    cambios = payload.model_dump(exclude_unset=True)
    if not cambios:
        print("Debe indicar al menos un campo para actualizar.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Debe indicar al menos un campo para actualizar."
        )
    
    fecha_inicio = cambios.get("fecha_inicio", relacion.fecha_inicio)
    fecha_fin = cambios.get("fecha_fin", relacion.fecha_fin)
    if fecha_fin is not None and fecha_fin < fecha_inicio:
        print("La fecha de fin no puede ser anterior a la fecha de inicio.")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail="La fecha de fin no puede ser anterior a la fecha de inicio."
        )
    
    for campo, valor in cambios.items():
        setattr(relacion, campo, valor)
    setattr(relacion, "updated_at", datetime.now(timezone.utc))

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=relacion.empresa_gestora_id,
        accion=AccionAuditoriaEnum.MODIFICACION,
        detalle={
            'recurso': 'gestorias_empresas',
            'accion': 'modificar',
        },
        trabajador_id=None,
    )
    db.commit()
    
    return relacion

@router.delete(
    "/{id_relacion}",
    response_model=GestoriaEmpresaSimpleResponse,
    summary="Dar de baja lógica autorización de gestoría",
    description="Revoca una autorización sin eliminar su historial.",
)
@limiter.limit("20/minute")
def revocar_autorizacion_gestoria(
    id_relacion: UUID,
    request: Request,
    usuario_actual: Usuarios = Depends(
        verificar_permisos_requeridos([
            AccionPermisoEnum.ELIMINAR + "-" + TipoPermisoEnum.GESTORIAS_EMPRESAS
        ])
    ),
    db: Session = Depends(get_db_with_advanced_security),
):
    """
    **DELETE /api/gestorias-empresas/{id_relacion}**

    Revoca una autorización de gestoría sin eliminar su historial.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de revocación de autorización de gestoría ({id_relacion}) desde la IP ({cliente_ip}) por el usuario: {usuario_actual.email}.")
    
    # Validaciones estructurales básicas
    relacion = _relacion_gestoria(db, id_relacion)
    if relacion.empresa_gestora_id != request.headers.get("Empresa-ID"):
        print("No se encontró la autorización solicitada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No se encontró la autorización solicitada."
        )

    try:
        if relacion.activo:
            setattr(relacion, "activo", False)
            setattr(relacion, "updated_at", datetime.now(timezone.utc))
            
            registrar_auditoria(
                db=db,
                request=request,
                usuario_id=usuario_actual.id,
                empresa_id=relacion.empresa_gestora_id,
                accion=AccionAuditoriaEnum.BAJA_LOGICA,
                detalle={
                    'recurso': 'gestorias_empresas',
                    'accion': 'revocar',
                },
                trabajador_id=None,
            )
            db.commit()
        return relacion
    except Exception as e:
        db.rollback()
        print(f"No se ha podido revocar la autorización de gestoría: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se ha podido revocar la autorización de gestoría.",
        )


