from sqlalchemy.orm import Session
from datetime import datetime
from trabajadores import Trabajadores
from empresas import Empresas
from fichajes import Fichajes
from schemas import empresas, fichajes, trabajadores

# ==========================================
# TRABAJADORES
# ==========================================

def obtener_trabajador(db: Session, trabajador_id: int):
    """Busca un empleado por su ID único."""
    return db.query(Trabajadores).filter(Trabajadores.id == trabajador_id).first()

def obtener_trabajador_por_email(db: Session, email: str):
    """Busca un empleado por su correo electrónico (útil para el login)."""
    return db.query(Trabajadores).filter(Trabajadores.email == email).first()

def obtener_trabajadores(db: Session, skip: int = 0, limit: int = 100):
    """Recupera el listado completo de trabajadores del sistema."""
    return db.query(Trabajadores).offset(skip).limit(limit).all()

def crear_trabajador(db: Session, obj_in: trabajadores.TrabajadorCreate):
    """Registra un nuevo empleado insertando su contraseña."""
    # Nota de seguridad: en el futuro aplicar un hash a la contraseña
    db_obj = Trabajadores(**obj_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# ==========================================
# EMPRESAS
# ==========================================

def obtener_empresas(db: Session, skip: int = 0, limit: int = 100):
    """Recupera todas las empresas dadas de alta en la plataforma."""
    return db.query(Empresas).offset(skip).limit(limit).all()

def crear_empresa(db: Session, obj_in: empresas.EmpresaCreate):
    """Guarda una nueva empresa en el sistema."""
    db_obj = Empresas(**obj_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# ==========================================
# FICHAJES
# ==========================================

def obtener_fichajes_por_trabajador_y_empresa(db: Session, trabajador_id: int, empresa_id: int):
    """Recupera el historial de marcajes de un empleado en una empresa específica."""
    return db.query(Fichajes).filter(
        Fichajes.trabajador_id == trabajador_id,
        Fichajes.empresa_id == empresa_id
    ).order_by(Fichajes.fecha.asc()).all()

def crear_fichaje(db: Session, obj_in: fichajes.FichajeCreate):
    """Registra un evento de jornada calculando el tiempo actual en el servidor."""
    ahora = datetime.now()
    db_obj = Fichajes(
        trabajador_id=obj_in.trabajador_id,
        empresa_id=obj_in.empresa_id,
        tipo_evento_id=obj_in.tipo_evento_id,
        fecha=int(ahora.timestamp()),  # Genera la marca de tiempo numérica entera
        fecha_hora=ahora               # Almacena el objeto DateTime nativo
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj