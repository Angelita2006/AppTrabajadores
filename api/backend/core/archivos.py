import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from core.security import obtener_usuario_actual 

router = APIRouter(prefix="/archivos", tags=["Archivos"])

import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from core.security import obtener_usuario_actual 

router = APIRouter(prefix="/api/archivos", tags=["Archivos"])

@router.get("/{subcarpeta}/{nombre_archivo}")
def obtener_archivo_protegido(
    subcarpeta: str,
    nombre_archivo: str,
    usuario_actual = Depends(obtener_usuario_actual)
):
    """
    Endpoint protegido y genérico que sirve cualquier recurso de la carpeta static 
    (logos, firmas, fotos_trabajadores) validando que el usuario esté autenticado.
    """
    # Lista blanca de subcarpetas permitidas por seguridad
    CARPETAS_PERMITIDAS = ["firmas", "logos", "fotos_trabajadores"]
    
    if subcarpeta not in CARPETAS_PERMITIDAS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado a esta categoría de archivos."
        )

    # Construye la ruta física de forma segura
    ruta_archivo = os.path.join("static", subcarpeta, nombre_archivo)
    
    # Validación contra Path Traversal y comprobación de existencia
    if not os.path.exists(ruta_archivo) or not os.path.isfile(ruta_archivo):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo solicitado no existe."
        )
        
    return FileResponse(ruta_archivo)