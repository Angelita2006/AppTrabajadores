from typing import List, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import settings

DATABASE_URL = settings.DATABASE_URL.__str__()
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

def get_db_with_advanced_security(
    is_superadmin: bool = False,
    is_gestoria_or_inspector: bool = False,
    allowed_empresa_ids: Optional[List[str]] = None,
    current_empresa_id: Optional[str] = None
):
    """
    Generador de sesiones avanzado para SaaS multiempresa con control de permisos jerárquico.
    """
    db = SessionLocal()
    try:
        if is_superadmin:
            # El superadmin desactiva las restricciones de tenant a nivel de sesión
            db.execute(text("SET LOCAL app.is_superadmin = 'true'"))
        else:
            db.execute(text("SET LOCAL app.is_superadmin = 'false'"))
            
            if is_gestoria_or_inspector and allowed_empresa_ids:
                # Pasamos la lista de IDs permitidos como un array de texto para PostgreSQL
                ids_formatted = ",".join([f"'{eid}'" for eid in allowed_empresa_ids])
                db.execute(text(f"SET LOCAL app.allowed_empresa_ids = ARRAY[{ids_formatted}]"))
            elif current_empresa_id:
                # Empresa individual normal
                db.execute(text(f"SET LOCAL app.current_empresa_id = '{current_empresa_id}'"))
                
        yield db
    finally:
        db.close()