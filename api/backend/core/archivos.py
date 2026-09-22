import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from core.security import obtener_usuario_actual 

router = APIRouter(prefix="/api/archivos", tags=["Archivos"])

DIRECCION_ACTUAL = Path(__file__).resolve()
BASE_STATIC_DIR = DIRECCION_ACTUAL.parent.parent.parent.parent.parent / "static" 

CARPETA_FOTOS_TRABAJADORES = BASE_STATIC_DIR / "fotos_trabajadores"
CARPETA_LOGOS = BASE_STATIC_DIR / "logos"
CARPETA_FIRMAS = BASE_STATIC_DIR / "firmas"

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

    # Construimos la ruta absoluta uniendo la base estática, la subcarpeta y el archivo
    ruta_archivo = BASE_STATIC_DIR / subcarpeta / nombre_archivo
    
    # Validación contra Path Traversal y comprobación de existencia usando el objeto Path
    if not ruta_archivo.exists() or not ruta_archivo.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El archivo solicitado no existe en la ruta: {ruta_archivo}"
        )

    print(ruta_archivo)
        
    return FileResponse(str(ruta_archivo))
