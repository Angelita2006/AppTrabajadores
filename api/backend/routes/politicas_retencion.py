from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
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

router = APIRouter(prefix="/api/politicas-retencion", tags=["Políticas de Retención"])

limiter = Limiter(key_func=get_remote_address)

@router.post("", response_model=PoliticaRetencionResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("15/minute")  # Protegido frente a la creación masiva de directivas de retención
def crear_politica_retencion(
    request: Request,
    obj_in: PoliticaRetencionCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: POST /api/politicas-retencion
    Establece una nueva directiva de retención validando permisos de administrador y tenant.
    """
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
        db.commit()
        db.refresh(nueva_politica)
        return nueva_politica

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al guardar la política de retención: {str(error)}"
        )



@router.put("/{id_politica}", response_model=PoliticaRetencionResponse)
@limiter.limit("15/minute")  # Protegido frente a modificaciones masivas no deseadas de plazos legales
def actualizar_anios_retencion(
    request: Request,
    id_politica: UUID, 
    nuevos_anios: int, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: PUT /api/politicas-retencion/{id_politica}?nuevos_anios=5
    Modifica la cantidad de años vigilando el cumplimiento legal y la autorización del tenant.
    """
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
    
    db.commit()
    db.refresh(politica)
    return politica


@router.get("", response_model=List[PoliticaRetencionResponse])
def obtener_todas_las_politicas(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: GET /api/politicas-retencion
    Devuelve la lista completa de directivas aplicando aislamiento estricto por tenant.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    query = db.query(PoliticasRetencion)

    if not usuario_actual.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No estás vinculado a ninguna empresa."
        )
    query = query.filter(
        (PoliticasRetencion.empresa_id == None) | 
        (PoliticasRetencion.empresa_id == usuario_actual.empresa_id)
    )

    return query.all()


@router.get("/global", response_model=Optional[PoliticaRetencionResponse])
def obtener_politica_global_defecto(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/politicas-retencion/global
    Recupera la directiva general del sistema bajo autenticación activa.
    """
    if not usuario_actual.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva."
        )

    politica_global = db.query(PoliticasRetencion).filter(PoliticasRetencion.empresa_id == None).first()
    if not politica_global:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se ha configurado ninguna política de retención global por defecto en el servidor."
        )
    return politica_global


@router.get("/empresa/{id_empresa}", response_model=PoliticaRetencionResponse)
def obtener_politica_aplicable_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA]))
):
    """
    URI: GET /api/politicas-retencion/empresa/{id_empresa}
    Busca la directiva de una empresa validando que el usuario tenga acceso a dicho tenant.
    """
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

    politica = db.query(PoliticasRetencion).filter(PoliticasRetencion.empresa_id == id_empresa).first()
    
    if not politica:
        politica = db.query(PoliticasRetencion).filter(PoliticasRetencion.empresa_id == None).first()
        
    if not politica:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se ha encontrado ninguna política aplicable (ni personalizada ni global) para esta empresa."
        )
    return politica
