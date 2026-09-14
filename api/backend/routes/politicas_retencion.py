from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.empresas import Empresas
from models.politicas_retencion import PoliticasRetencion
from models.usuarios import Usuarios
from schemas.politicas_retencion import PoliticaRetencionCreate, PoliticaRetencionResponse
from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum

# Configuración del enrutador para la gestión de políticas de retención de datos y cumplimiento legal
router = APIRouter(prefix="/api/politicas-retencion", tags=["Políticas de Retención"])

# Configuración del limitador de tasa de peticiones por IP para prevenir abusos y ataques de denegación
limiter = Limiter(key_func=get_remote_address)


@router.get("/global", response_model=Optional[PoliticaRetencionResponse], summary="Obtener política global por defecto")
@limiter.limit("60/minute") 
def obtener_politica_global_defecto(
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/politicas-retencion/global**
    
    Recupera la directiva general del sistema bajo autenticación activa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de política global de retención desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    politica_global = db.query(PoliticasRetencion).options(
        joinedload(PoliticasRetencion.empresa)
    ).filter(PoliticasRetencion.empresa_id == None).first()
    
    if not politica_global:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se ha configurado ninguna política de retención global por defecto en el servidor."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=usuario_actual.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "politicas_retencion", "accion": "obtener_global", "entidad_id": str(politica_global.id), "detalles": "Se consultó la política de retención global por defecto"}
    )
    db.commit()

    return politica_global


@router.get("/empresa/{id_empresa}", response_model=PoliticaRetencionResponse, summary="Obtener política aplicable a empresa")
@limiter.limit("60/minute") 
def obtener_politica_aplicable_empresa(
    request: Request,
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **GET /api/politicas-retencion/empresa/{id_empresa}**
    
    Busca la directiva de una empresa validando que el usuario tenga acceso a dicho tenant.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de política de retención para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    if usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar la política de retención de esta empresa."
        )

    politica = db.query(PoliticasRetencion).options(
        joinedload(PoliticasRetencion.empresa)
    ).filter(PoliticasRetencion.empresa_id == id_empresa).first()
    
    if not politica:
        politica = db.query(PoliticasRetencion).options(
            joinedload(PoliticasRetencion.empresa)
        ).filter(PoliticasRetencion.empresa_id == None).first()
        
    if not politica:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se ha encontrado ninguna política aplicable (ni personalizada ni global) para esta empresa."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "politicas_retencion", "accion": "obtener_por_empresa", "entidad_id": str(politica.id), "detalles": f"Se consultó la política de retención aplicable para la empresa {id_empresa}"}
    )
    db.commit()

    return politica


@router.post("", response_model=PoliticaRetencionResponse, status_code=status.HTTP_201_CREATED, summary="Crear política de retención")
@limiter.limit("15/minute") 
def crear_politica_retencion(
    request: Request,
    obj_in: PoliticaRetencionCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **POST /api/politicas-retencion**
    
    Establece una nueva directiva de retención validando permisos de administrador y tenant.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de creación de política de retención desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    if not obj_in.empresa_id or usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar políticas de retención globales o para otra empresa."
        )

    try:
        if obj_in.empresa_id:
            empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
            if not empresa:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
                )

            politica_existente = db.query(PoliticasRetencion).filter(
                PoliticasRetencion.empresa_id == obj_in.empresa_id
            ).first()
            
            if politica_existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Esta empresa ya cuenta con una política de retención personalizada registrada."
                )

        nueva_politica = PoliticasRetencion(
            anios_conservacion=obj_in.anios_conservacion,
            accion_tras_periodo=obj_in.accion_tras_periodo,
            empresa_id=obj_in.empresa_id
        )
        
        db.add(nueva_politica)
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=obj_in.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "politicas_retencion", "accion": "crear_politica", "entidad_id": str(nueva_politica.id), "detalles": f"Se creó una nueva política de retención para la empresa {obj_in.empresa_id}"}
        )

        db.commit()
        
        politica_creada = db.query(PoliticasRetencion).options(
            joinedload(PoliticasRetencion.empresa)
        ).filter(PoliticasRetencion.id == nueva_politica.id).first()
        
        return politica_creada

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido guardar la política de retención: {str(error)}"
        )


@router.put("/{id_politica}", response_model=PoliticaRetencionResponse, summary="Actualizar años de retención")
@limiter.limit("15/minute") 
def actualizar_anios_retencion(
    request: Request,
    id_politica: UUID, 
    nuevos_anios: int, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    **PUT /api/politicas-retencion/{id_politica}?nuevos_anios=5**
    
    Modifica la cantidad de años vigilando el cumplimiento legal y la autorización del tenant.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de actualización de la política {id_politica} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    politica = db.query(PoliticasRetencion).filter(PoliticasRetencion.id == id_politica).first()
    if not politica:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Política de retención con ID {id_politica} no encontrada."
        )

    if usuario_actual.empresa_id != politica.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar esta política de retención."
        )
        
    if nuevos_anios < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción denegada. La normativa vigente exige una conservación mínima de 4 años para los registros horarios."
        )
        
    setattr(politica, "anios_conservacion", nuevos_anios)
    
    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=politica.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "politicas_retencion", "accion": "actualizar_anios", "entidad_id": str(id_politica), "detalles": f"Se actualizaron los años de retención a {nuevos_anios} para la política {id_politica}"}
        )

        db.commit()
        
        politica_actualizada = db.query(PoliticasRetencion).options(
            joinedload(PoliticasRetencion.empresa)
        ).filter(PoliticasRetencion.id == id_politica).first()
        
        return politica_actualizada
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido actualizar la política de retención: {str(error)}"
        )