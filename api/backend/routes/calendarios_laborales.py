import json
import os
from google import genai 
from google.genai import types
from core.config import settings
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from schemas.festivos import FestivoResponse2
from core.database import get_db
from core.security import obtener_usuario_actual
from models.festivos import Festivos
from models.empresas import Empresas
from models.centros_trabajo import CentrosTrabajo
from models.calendarios_laborales import CalendariosLaborales
from models.usuarios import Usuarios
from schemas.calendarios_laborales import CalendarioConFestivosResponse, CalendarioLaboralCreate, CalendarioLaboralResponse, CalendarioLaboralUpdate

router = APIRouter(prefix="/api/calendarios-laborales", tags=["Calendarios Laborales"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=CalendarioLaboralResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def crear_calendario_laboral(
    request: Request,
    obj_in: CalendarioLaboralCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/calendarios-laborales
    Registra un nuevo calendario laboral anual asociándolo a una empresa o centro de trabajo.
    """
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear calendarios laborales en esta empresa."
        )

    try:
        # 1. Validación de seguridad: Verifica que la empresa exista
        empresa = db.query(Empresas).filter(Empresas.id == obj_in.empresa_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Empresa ({obj_in.empresa_id}) no encontrada."
            )

        # 2. Validación de seguridad: Si se asocia a un centro, verifica que exista
        if obj_in.centro_trabajo_id:
            centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == obj_in.centro_trabajo_id).first()
            if not centro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Centro de trabajo ({obj_in.centro_trabajo_id}) no encontrado."
                )

        # 3. Mapea los datos del esquema directamente al modelo físico de SQLAlchemy
        nuevo_calendario = CalendariosLaborales(
            empresa_id=obj_in.empresa_id,
            anio=obj_in.anio,
            nombre=obj_in.nombre,
            centro_trabajo_id=obj_in.centro_trabajo_id
        )
        
        db.add(nuevo_calendario)
        db.commit()
        db.refresh(nuevo_calendario)
        return nuevo_calendario

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ha ocurrido un error al crear el calendario laboral: {str(error)}"
        )


@router.put("/{id_calendario}", response_model=CalendarioLaboralResponse)
@limiter.limit("20/minute")
def actualizar_calendario_laboral(
    request: Request,
    id_calendario: UUID, 
    obj_in: CalendarioLaboralUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: PUT /api/calendarios-laborales/{id_calendario}
    Actualiza el año, nombre y/o centro de trabajo de un calendario existente.
    """
    # 1. Buscar el calendario por su ID único
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == id_calendario).first()
    if not calendario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendario laboral con ID {id_calendario} no encontrado."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != calendario.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar este calendario laboral."
        )

    # 2. Validación de seguridad opcional: Si se provee un centro_trabajo_id, verificar que exista
    if obj_in.centro_trabajo_id is not None:
        centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == obj_in.centro_trabajo_id).first()
        if not centro:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Centro de trabajo ({obj_in.centro_trabajo_id}) no encontrado."
            )

    try:
        # 3. Actualizar dinámicamente solo los campos provistos en el cuerpo (payload)
        if obj_in.anio is not None:
            calendario.anio = obj_in.anio
        if obj_in.nombre is not None:
            calendario.nombre = obj_in.nombre
        
        calendario.centro_trabajo_id = obj_in.centro_trabajo_id

        db.add(calendario)

        db.commit()
        db.refresh(calendario)
        return calendario

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el calendario laboral: {str(error)}"
        )


@router.get("", response_model=List[CalendarioLaboralResponse])
def obtener_todos_los_calendarios(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/calendarios-laborales
    Devuelve la lista global de todos los calendarios aplicando aislamiento multi-tenant.
    """
    query = db.query(CalendariosLaborales)
    
    if usuario_actual.tipo_usuario != "Administrador":
        if not usuario_actual.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No estás vinculado a ninguna empresa."
            )
        query = query.filter(CalendariosLaborales.empresa_id == usuario_actual.empresa_id)

    return query.all()


@router.get("/empresa/{id_empresa}", response_model=List[CalendarioLaboralResponse])
def obtener_calendarios_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/calendarios-laborales/empresa/{id_empresa}
    Recupera los calendarios dados de alta de forma aislada por una organización (tenant).
    """
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los calendarios de esta empresa."
        )

    return db.query(CalendariosLaborales).filter(CalendariosLaborales.empresa_id == id_empresa).all()


@router.get("/centro/{id_centro}", response_model=List[CalendarioLaboralResponse])
def obtener_calendarios_centro(
    id_centro: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/calendarios-laborales/centro/{id_centro}
    Recupera los calendarios asociados específicamente a una sede física concreta.
    """
    centro = db.query(CentrosTrabajo).filter(CentrosTrabajo.id == id_centro).first()
    if not centro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro de trabajo no encontrado.")

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != centro.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los calendarios de este centro de trabajo."
        )

    return db.query(CalendariosLaborales).filter(CalendariosLaborales.centro_trabajo_id == id_centro).all()


@router.get("/{id_calendario}", response_model=CalendarioLaboralResponse)
def obtener_calendario_laboral(
    id_calendario: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/calendarios-laborales/{id_calendario}
    Busca un calendario laboral específico mediante su identificador único UUID.
    """
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == id_calendario).first()
    if not calendario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendario laboral con ID {id_calendario} no encontrado."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != calendario.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar este calendario laboral."
        )

    return calendario


@router.delete("/{id_calendario}", status_code=status.HTTP_200_OK)
def eliminar_calendario_laboral(
    id_calendario: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: DELETE /api/calendarios-laborales/{id_calendario}
    Elimina físicamente un calendario. Al tener 'ondelete=CASCADE', la base de datos 
    borrará de forma automática todos sus festivos asociados.
    """
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == id_calendario).first()
    if not calendario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendario laboral con ID {id_calendario} no encontrado."
        )
    
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != calendario.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar este calendario laboral."
        )

    db.delete(calendario)
    db.commit()
    return {"detail": f"Calendario laboral ({id_calendario}) eliminado correctamente junto con sus festivos asociados."}


@router.get("/empresa/{id_empresa}/con-festivos", response_model=List[CalendarioConFestivosResponse])
def obtener_calendarios_y_festivos_empresa(
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    Recupera todos los calendarios de una empresa integrando sus respectivos días festivos.
    """
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para consultar los calendarios y festivos de esta empresa."
        )

    # 1. Verificamos si la empresa existe
    empresa_existe = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa_existe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La empresa con ID {id_empresa} no existe."
        )

    # 2. Buscamos los calendarios de la empresa
    calendarios = db.query(CalendariosLaborales).filter(CalendariosLaborales.empresa_id == id_empresa).all()
    
    resultado = []
    for cal in calendarios:
        # 3. Buscamos manualmente los festivos en la BD asociados a este calendario
        festivos_db = db.query(Festivos).filter(Festivos.calendario_id == cal.id).order_by(Festivos.fecha.asc()).all()
        
        # 4. Construimos la lista utilizando el Schema de Pydantic explícitamente
        lista_festivos = []
        for f in festivos_db:
            lista_festivos.append(
                FestivoResponse2(
                    id=f.id,
                    fecha=f.fecha,          
                    descripcion=f.descripcion if f.descripcion is not None else "",
                    tipo=f.tipo
                )
            )
        
        # 5. Agregamos el objeto del calendario empaquetando sus festivos
        resultado.append(
            CalendarioConFestivosResponse(
                id=cal.id,
                nombre=cal.nombre,
                anio=cal.anio,
                centro_trabajo_id=cal.centro_trabajo_id,
                festivos=lista_festivos
            )
        )
        
    return resultado


def analizar_pdf_con_ia(contenido_pdf: bytes) -> list:
    """
    Envía el archivo PDF binario a Gemini para que extraiga visualmente
    todos los días festivos en un formato JSON limpio.
    """
    # Inicializa el cliente usando la clave de entorno GEMINI_API_KEY
    client = genai.Client(api_key=settings.GEMINI_API_KEY.__str__())
    
    # Preparamos el archivo binario para enviarlo directamente como InlineData
    documento_pdf = types.Part.from_bytes(
        data=contenido_pdf,
        mime_type="application/pdf",
    )
    
    # Creamos el prompt pidiéndole estrictamente un JSON estructurado
    prompt = (
        "Analiza visualmente este calendario laboral en PDF. "
        "Identifica todos los días festivos indicados (generalmente marcados en color o listados). "
        "Devuelve la lista de festivos estrictamente en un formato JSON estructurado con el siguiente esquema: "
        "[{\"fecha\": \"YYYY-MM-DD\", \"descripcion\": \"Nombre del festivo\", \"tipo\": \"Nacional\" | \"Autonómico\" | \"Local\"}]. "
        "No incluyas explicaciones ni bloques de código markdown, solo el JSON crudo."
    )
    
    # Llamamos al modelo idóneo para procesamiento de documentos mutimodales
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=[documento_pdf, prompt]
    )
    
    try:
        # Limpiamos posibles espacios o formatos de texto sobrantes de la respuesta
        texto_limpio = response.text.strip() if response.text else ""
        if texto_limpio.startswith("```json"):
            texto_limpio = texto_limpio.split("```json")[1].split("```")[0].strip()
        elif texto_limpio.startswith("```"):
            texto_limpio = texto_limpio.split("```")[1].split("```")[0].strip()
            
        return json.loads(texto_limpio)
    except Exception as e:
        print(f"Error al parsear el JSON de Gemini: {e}")
        # Retorno de emergencia si la IA no estructuró bien la respuesta
        return []
    

@router.post("/calendarios/{calendario_id}/importar-pdf")
@limiter.limit("10/minute")
async def importar_calendario_pdf(
    request: Request,
    calendario_id: UUID, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    calendario = db.query(CalendariosLaborales).filter(CalendariosLaborales.id == calendario_id).first()
    if not calendario:
        raise HTTPException(status_code=404, detail="Calendario laboral no encontrado.")

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != calendario.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para importar festivos en este calendario laboral."
        )

    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un formato PDF válido.")
        
    try:
        contenido_pdf = await file.read()
        
        # 1. Extracción mediante Gemini
        festivos_detectados = analizar_pdf_con_ia(contenido_pdf)
        
        festivos_finales_retorno = []
        
        # 2. Procesamos cada festivo evitando violar la restricción unique de la Base de Datos
        for f in festivos_detectados:
            fecha_str = f["fecha"]
            
            # Verificamos si ya existe un registro para ese calendario en esa misma fecha
            festivo_existente = db.query(Festivos).filter(
                Festivos.calendario_id == calendario_id,
                Festivos.fecha == fecha_str
            ).first()
            
            if festivo_existente:
                festivo_existente.descripcion = f["descripcion"] if f.get("descripcion") is not None else ""
                festivo_existente.tipo = f["tipo"]
                festivos_finales_retorno.append(festivo_existente)
            else:
                # ➕ Si NO existe, creamos el registro desde cero de forma segura
                nuevo_festivo = Festivos(
                    calendario_id=calendario_id,
                    fecha=fecha_str,
                    tipo=f["tipo"],
                    descripcion=f["descripcion"] if f.get("descripcion") is not None else ""
                )
                db.add(nuevo_festivo)
                festivos_finales_retorno.append(nuevo_festivo)
            
        # 3. Guardamos los cambios de forma segura en una sola transacción
        if festivos_finales_retorno:
            db.commit()
            # Refrescamos las instancias para recuperar los IDs reales
            for f in festivos_finales_retorno:
                db.refresh(f)
            
        return {
            "status": "success", 
            "total_importados": len(festivos_finales_retorno), 
            "festivos": [
                {
                    "id": f.id,
                    "calendario_id": f.calendario_id,
                    "fecha": f.fecha,
                    "tipo": f.tipo,
                    "descripcion": f.descripcion
                } for f in festivos_finales_retorno
            ]
        }

    except Exception as e:
        db.rollback()  # Revierte cualquier cambio si ocurre un error imprevisto
        print(f"Error detallado en la persistencia del PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al procesar y guardar el PDF: {str(e)}")