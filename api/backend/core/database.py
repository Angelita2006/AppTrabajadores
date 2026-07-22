from typing import Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import settings

DATABASE_URL = settings.DATABASE_URL.__str__()
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    Generador de sesiones de base de datos estándar (sin contexto de tenant estricto).
    Útil para tareas públicas o de login inicial.
    """
    db = SessionLocal()
    try:
        yield db 
    finally:
        db.close()

def get_db_with_tenant(empresa_id: Optional[str] = None, is_gestoria_admin: bool = False):
    """
    Generador de sesiones adaptado al modelo SaaS multiempresa. 
    Configura las variables de sesión de PostgreSQL para activar las políticas RLS 
    definidas en el esquema SQL (app.current_empresa_id y app.is_gestoria_admin).
    """
    db = SessionLocal()
    try:
        # Configurar variables de sesión para Row Level Security (RLS)
        if is_gestoria_admin:
            db.execute(text("SET LOCAL app.is_gestoria_admin = 'true'"))
        else:
            db.execute(text("SET LOCAL app.is_gestoria_admin = 'false'"))
            
        if empresa_id:
            db.execute(text(f"SET LOCAL app.current_empresa_id = '{empresa_id}'"))
        else:
            db.execute(text("SET LOCAL app.current_empresa_id = NULL"))
            
        yield db
    finally:
        db.close()