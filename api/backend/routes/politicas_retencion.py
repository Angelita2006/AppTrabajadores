from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from core.database import get_db
from models.empresas import Empresas
from models.politicas_retencion import PoliticasRetencion
from schemas.politicas_retencion import PoliticaRetencionCreate, PoliticaRetencionResponse

router = APIRouter(prefix="/api/politicas-retencion", tags=["Políticas de Retención"])

@router.post("", response_model=PoliticaRetencionResponse, status_code=status.HTTP_201_CREATED)
def crear_politica_retencion(obj_in: PoliticaRetencionCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/politicas-retencion
    Establece una nueva directiva de retención horaria validando el cumplimiento del mínimo legal de 4 años.
    """
    try:
        # 1. Validación de seguridad: Si se asocia a una empresa, verifica que exista
        if obj_in.empresa_id:
            empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
            if not empresa:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
                )

            # 2. Comprobación de la restricción de unicidad: Una empresa solo puede tener una política
            politica_existente = db.query(PoliticasRetencion).filter(
                PoliticasRetencion.empresa_id == obj_in.empresa_id
            ).first()
            
            if politica_existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Esta empresa ya cuenta con una política de retención personalizada registrada."
                )

        # 3. Mapea los datos del esquema directamente al modelo físico de SQLAlchemy
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


@router.get("", response_model=List[PoliticaRetencionResponse])
def obtener_todas_las_politicas(db: Session = Depends(get_db)):
    """
    URI: GET /api/politicas-retencion
    Devuelve la lista completa de directivas de retención dadas de alta en el sistema Saas.
    """
    return db.query(PoliticasRetencion).all()


@router.get("/global", response_model=Optional[PoliticaRetencionResponse])
def obtener_politica_global_defecto(db: Session = Depends(get_db)):
    """
    URI: GET /api/politicas-retencion/global
    Recupera la directiva general del sistema aplicada a las empresas sin configuración propia (donde empresa_id es NULL).
    """
    politica_global = db.query(PoliticasRetencion).filter(PoliticasRetencion.empresa_id == None).first()
    if not politica_global:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se ha configurado ninguna política de retención global por defecto en el servidor."
        )
    return politica_global


@router.get("/empresa/{id_empresa}", response_model=PoliticaRetencionResponse)
def obtener_politica_aplicable_empresa(id_empresa: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/politicas-retencion/empresa/{id_empresa}
    Busca la directiva de una empresa. Si no tiene una específica, devuelve la global por defecto del Saas.
    """
    # 1. Intenta localizar la directiva personalizada de la empresa
    politica = db.query(PoliticasRetencion).filter(PoliticasRetencion.empresa_id == id_empresa).first()
    
    # 2. Si no tiene, busca la directiva general del sistema (NULL)
    if not politica:
        politica = db.query(PoliticasRetencion).filter(PoliticasRetencion.empresa_id == None).first()
        
    if not politica:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se ha encontrado ninguna política aplicable (ni personalizada ni global) para esta empresa."
        )
    return politica


@router.put("/{id_politica}", response_model=PoliticaRetencionResponse)
def actualizar_anios_retencion(id_politica: UUID, nuevos_anios: int, db: Session = Depends(get_db)):
    """
    URI: PUT /api/politicas-retencion/{id_politica}?nuevos_anios=5
    Modifica la cantidad de años de conservación de una política vigilando que cumpla la barrera legal.
    """
    politica = db.query(PoliticasRetencion).filter(PoliticasRetencion.id == id_politica).first()
    if not politica:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Política de retención con ID {id_politica} no encontrada."
        )
        
    # Emula el CheckConstraint físico forzando el mínimo legal de 4 años del Estatuto de los Trabajadores
    if nuevos_anios < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción denegada. La normativa vigente exige una conservación mínima de 4 años para los registros horarios."
        )
        
    # Modificación segura utilizando setattr para eludir advertencias de tipo estrictas en Pylance
    setattr(politica, "anios_conservacion", nuevos_anios)
    
    db.commit()
    db.refresh(politica)
    return politica
