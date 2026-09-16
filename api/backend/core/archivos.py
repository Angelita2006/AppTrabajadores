import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from core.security import obtener_usuario_actual 

router = APIRouter(prefix="/api/archivos", tags=["Archivos"])

# 1. Obtenemos la ruta absoluta del directorio actual de este archivo Python
# 2. Navegamos hasta la carpeta 'backend' donde se encuentra 'static'.
# (Ajusta los '.parent' según en qué subcarpeta exacta de 'backend' tengas guardado este archivo de rutas)
DIRECCION_ACTUAL = Path(__file__).resolve()
# Ejemplo: Si este archivo está en backend/routers/archivos.py, necesitamos subir 2 niveles para llegar a backend y entrar en static.
BASE_STATIC_DIR = DIRECCION_ACTUAL.parent.parent / "static" 

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
