import os
import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from fastapi.middleware.cors import CORSMiddleware
from core import archivos
from core.init_db import inicializar_permisos_sistema, inicializar_roles_sistema, inicializar_relaciones_roles_permisos, inicializar_politica_retencion_global
from core.config import settings
from core.database import SessionLocal, engine
from routes import (
    asignaciones_turno, auditoria_accesos, ausencias, calendarios_laborales,
    centros_trabajo, contratos, correcciones_fichaje, departamentos,
    dispositivos_fichaje, empresas, festivos, fichajes, motivos_pausa,
    permisos, politicas_retencion, resumenes_jornada, roles_permisos, roles,
    trabajadores, turnos, usuarios, licencias, usuarios_empresas, gestorias_empresas, 
    contratos_calendarios, auth
)
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# 1. Configurar el sistema de logs del servidor
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="API de Registro horario trabajadores",
    description="API centralizada para gestionar fichajes, jornadas, trabajadores, roles y empresas de FICHAPP.",
    version="1.0.0",
)

@app.on_event("startup")
def startup_event():
    """
    Inicializa tareas en segundo plano y carga los datos semilla esenciales al arrancar la API.
    """
    db = SessionLocal()
    try:
        inicializar_roles_sistema(db)
        inicializar_permisos_sistema(db)
        inicializar_relaciones_roles_permisos(db)
        inicializar_politica_retencion_global(db)
        logger.info("Roles del sistema verificados/inicializados correctamente.")
    except Exception as e:
        logger.error(f"Error crítico al inicializar los roles del sistema: {e}")
    finally:
        db.close()


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    limite_info = str(exc.detail) if hasattr(exc, "detail") else "Límite de velocidad excedido"
    
    response = JSONResponse(
        status_code=429,
        content={
            "success": False,
            "message": f"Demasiadas solicitudes. Límite superado: {limite_info}.",
            "error_code": "RATE_LIMIT_EXCEEDED"
        }
    )
    
    retry_after = getattr(exc, "retry_after", None)
    if retry_after:
        response.headers["Retry-After"] = str(retry_after)
        
    return response

@app.exception_handler(FastAPIHTTPException)
async def http_exception_handler(request: Request, exc: FastAPIHTTPException):
    logger.warning(f"HTTP Error {exc.status_code} en {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
        },
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Error crítico no controlado en {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Hubo un fallo en los servidores. Por favor, inténtalo de nuevo más tarde.",
        },
    )

# GESTIÓN DE CORS SEGURA
origins_env = os.getenv("ALLOWED_ORIGINS")
origins = [origin.strip() for origin in origins_env.split(",")] if origins_env else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"], 
    allow_headers=["Authorization", "Content-Type", "Accept", "Empresa-ID"],
)

# Registro de las URIs y enrutadores modulares
app.include_router(asignaciones_turno.router)
app.include_router(auditoria_accesos.router)
app.include_router(ausencias.router)
app.include_router(calendarios_laborales.router)
app.include_router(centros_trabajo.router)
app.include_router(contratos.router)
app.include_router(correcciones_fichaje.router)
app.include_router(departamentos.router)
app.include_router(dispositivos_fichaje.router)
app.include_router(empresas.router)
app.include_router(festivos.router)
app.include_router(fichajes.router)
app.include_router(motivos_pausa.router)
app.include_router(permisos.router)
app.include_router(politicas_retencion.router)
app.include_router(resumenes_jornada.router)
app.include_router(roles.router)
app.include_router(roles_permisos.router)
app.include_router(trabajadores.router)
app.include_router(turnos.router)
app.include_router(usuarios.router) 
app.include_router(auth.router)
app.include_router(archivos.router)
app.include_router(licencias.router)
app.include_router(usuarios_empresas.router)
app.include_router(gestorias_empresas.router)
app.include_router(contratos_calendarios.router)

@app.get(
    "/api",
    summary="Documentación de la API",
    description="Redirige a la documentación interactiva de Swagger UI.",
)
def read_root():
    """Redirige automáticamente a la interfaz de documentación de la API."""
    return RedirectResponse(url="/docs", status_code=status.HTTP_303_SEE_OTHER)