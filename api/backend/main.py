import os
import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.database import SessionLocal, engine
from routes import (
    auth, asignaciones_turno, auditoria_accesos, ausencias, calendarios_laborales, 
    centros_trabajo, contratos, correcciones_fichaje, departamentos, dispositivos_fichaje, 
    dispositivos_push, empresas, festivos, fichajes, motivos_pausa, permisos, politicas_retencion, 
    resumenes_jornada, roles, tipos_evento_fichaje, trabajadores, turnos, usuarios_roles, usuarios
)
from core.fichajes_scheduler import iniciar_scheduler_fichajes
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.staticfiles import StaticFiles

# 1. Configurar el sistema de logs del servidor
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# 1. Asegurar que la carpeta física exista al arrancar el servidor
os.makedirs("static/logos", exist_ok=True)

app = FastAPI(
    title="API de Registro horario trabajadores",
    description="API centralizada para gestionar fichajes, jornadas, trabajadores, roles y empresas de FICHAPP.",
    version="1.0.0",
)

# 2. Montar la carpeta estática para que sea accesible públicamente por HTTP
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
def startup_event():
    """
    Inicializa tareas en segundo plano (como el cron de verificación de olvidos de fichaje) al arrancar la API.
    """
    iniciar_scheduler_fichajes()

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

# Manejador personalizado para RateLimitExceeded (Seguro para Pylance y limpio para el frontend)
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

# 2. Manejador global para excepciones HTTP controladas (ej. 400, 404, 403)
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

# 3. Manejador global para errores internos inesperados (Evita fugar trazas técnicas y devuelve error 500 limpio)
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

# GESTIÓN DE CORS SEGURA PARA PRODUCCIÓN
origins_env = os.getenv("ALLOWED_ORIGINS", "")
origins = [origin.strip() for origin in origins_env.split(",")] if origins_env else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],  # Si hay variable definida usa esa, de lo contrario flexible para desarrollo local
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# NOTA DE PRODUCCIÓN: 
# La línea `Base.metadata.create_all(bind=engine)` y el script de migración automática de 
# contraseñas han sido excluidos para mantener un arranque limpio y seguro en producción (manejado por Alembic).

# Registro de las URIs y enrutadores modulares en el núcleo de la aplicación FastAPI
app.include_router(asignaciones_turno.router)
app.include_router(auditoria_accesos.router)
app.include_router(ausencias.router)
app.include_router(calendarios_laborales.router)
app.include_router(centros_trabajo.router)
app.include_router(contratos.router)
app.include_router(correcciones_fichaje.router)
app.include_router(departamentos.router)
app.include_router(dispositivos_fichaje.router)
app.include_router(dispositivos_push.router)
app.include_router(empresas.router)
app.include_router(festivos.router)
app.include_router(fichajes.router)
app.include_router(motivos_pausa.router)
app.include_router(permisos.router)
app.include_router(politicas_retencion.router)
app.include_router(resumenes_jornada.router)
app.include_router(roles.router)
app.include_router(tipos_evento_fichaje.router)
app.include_router(trabajadores.router)
app.include_router(turnos.router)
app.include_router(usuarios_roles.router)
app.include_router(usuarios.router) 
app.include_router(auth.router)

@app.get("/api")
def read_root():
    return {"mensaje": "¡API de FICHAPP funcionando en producción!"}