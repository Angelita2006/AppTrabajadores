from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import settings

DATABASE_URL = settings.DATABASE_URL.__str__()
if not DATABASE_URL.strip():
    raise RuntimeError("DATABASE_URL es obligatoria. Configúrala en el entorno o en el archivo .env de la raíz del proyecto.")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    Generador de sesiones de base de datos estándar (sin contexto de seguridad estricto).
    Útil para tareas públicas o de login inicial.
    """
    db = SessionLocal()
    try:
        yield db 
    finally:
        db.close()
