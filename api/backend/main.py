from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import Base, engine
from routes import auth, asignaciones_turno, auditoria_accesos, ausencias, calendarios_laborales, centros_trabajo, contratos, correcciones_fichaje, departamentos, dispositivos_fichaje, empresas, festivos, fichajes, motivos_pausa, permisos, politicas_retencion, resumenes_jornada, roles, tipos_evento_fichaje, trabajadores, turnos, usuarios_roles, usuarios
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="API de Registro horario trabajadores",
    description="API centralizada para gestionar fichajes, jornadas, trabajadores, roles y empresas de FICHAPP.",
    version="1.0.0",
    # docs_url=None,
    # redoc_url=None
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

@app.get("/")
def read_root():
    return {"mensaje": "¡Conexión exitosa desde React Native!"}