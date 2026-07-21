import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import Base, engine
from routes import auth, asignaciones_turno, auditoria_accesos, ausencias, calendarios_laborales, centros_trabajo, contratos, correcciones_fichaje, departamentos, dispositivos_fichaje, empresas, festivos, fichajes, motivos_pausa, permisos, politicas_retencion, resumenes_jornada, roles, tipos_evento_fichaje, trabajadores, turnos, usuarios_roles, usuarios
from dotenv import load_dotenv

load_dotenv()

# app = FastAPI(
#     title="API de Registro horario trabajadores",
#     description="API centralizada para gestionar fichajes, jornadas, trabajadores, roles y empresas de FICHAPP.",
#     version="1.0.0"
# )

# # Construcción automática de las tablas físicas en la base de datos al arrancar el servidor
# Base.metadata.create_all(bind=engine)

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # Permite peticiones desde emuladores Android/iOS y dispositivos reales
#     allow_credentials=True,
#     allow_methods=["*"],  # Habilita todos los métodos HTTP de tus rutas (GET, POST, PUT, DELETE)
#     allow_headers=["*"],  # Habilita todas las cabeceras estándar de control de peticiones
# )

app = FastAPI(
    title="API de Registro horario trabajadores",
    description="API centralizada para gestionar fichajes, jornadas, trabajadores, roles y empresas de FICHAPP.",
    version="1.0.0",
    # Opcional en producción: deshabilitar la documentación automática si no deseas que sea pública
    # docs_url=None, 
    # redoc_url=None
)

# 1. GESTIÓN DE CORS SEGURA PARA PRODUCCIÓN
# En lugar de permitir todo ("*"), se cargan los orígenes permitidos desde una variable de entorno.
# Ejemplo en .env: ALLOWED_ORIGINS="https://tuweb.com,app://fichapp"
origins_env = os.getenv("ALLOWED_ORIGINS", "")
origins = [origin.strip() for origin in origins_env.split(",")] if origins_env else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else [],  # Si está vacío, no abre brechas innecesarias
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # Limitar solo a los métodos necesarios
    allow_headers=["Authorization", "Content-Type", "Accept"],  # Limitar a las cabeceras estándar requeridas
)

# NOTA DE PRODUCCIÓN: 
# La línea `Base.metadata.create_all(bind=engine)` ha sido eliminada. 
# En producción, las tablas y cambios de esquema deben gestionarse estrictamente 
# mediante las migraciones de Alembic ejecutadas en el despliegue.

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

# @app.get("/")
# def read_root():
#     return {"mensaje": "¡Conexión exitosa desde React Native!"}

@app.get("/")
def read_root():
    return {"mensaje": "¡API de FICHAPP funcionando en producción!"}