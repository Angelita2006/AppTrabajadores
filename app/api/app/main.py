from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import Base, engine
from routes import empresa, fichaje, horario, trabajador, vacacion, incidencia


app = FastAPI(
    title="API de Registro horario trabajadores",
    description="API centralizada para gestionar fichajes, horarios, trabajadores y empresas de FICHAPP.",
    version="1.0.0",
)

# Construcción automática de las tablas físicas en la base de datos al arrancar el servidor
Base.metadata.create_all(bind=engine)

# Configuración del Middleware CORS para habilitar la comunicación con dispositivos móviles
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite peticiones desde emuladores Android/iOS y dispositivos reales
    allow_credentials=True,
    allow_methods=["*"],  # Habilita todos los métodos HTTP de tus rutas (GET, POST, PUT, DELETE)
    allow_headers=["*"],  # Habilita todas las cabeceras estándar de control de peticiones
)

# Registro de las URIs y enrutadores modulares en el núcleo de la aplicación FastAPI
app.include_router(empresa.router, prefix="/api")
app.include_router(fichaje.router, prefix="/api")
app.include_router(horario.router, prefix="/api")
app.include_router(trabajador.router, prefix="/api")
app.include_router(vacacion.router, prefix="/api")
app.include_router(incidencia.router, prefix="/api")
