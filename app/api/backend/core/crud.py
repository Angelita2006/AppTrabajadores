from sqlalchemy.orm import Session
from datetime import datetime
from models.trabajador import Trabajador
from models.empresa import Empresa
from models.fichaje import Fichaje
from models.vacacion import Vacacion
from models.incidencia import Incidencia
from schemas import trabajador, empresa, fichaje, vacacion, incidencia

# ==========================================
# TRABAJADORES
# ==========================================

def obtener_trabajador(db: Session, trabajador_id: int):
    """Busca un empleado por su ID único."""
    return db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()

def obtener_trabajador_por_email(db: Session, email: str):
    """Busca un empleado por su correo electrónico (útil para el login)."""
    return db.query(Trabajador).filter(Trabajador.email == email).first()

def obtener_trabajadores(db: Session, skip: int = 0, limit: int = 100):
    """Recupera el listado completo de trabajadores del sistema."""
    return db.query(Trabajador).offset(skip).limit(limit).all()

def crear_trabajador(db: Session, obj_in: trabajador.TrabajadorCreate):
    """Registra un nuevo empleado insertando su contraseña."""
    # Nota de seguridad: Aquí es donde en el futuro aplicarías un hash a la contraseña
    db_obj = Trabajador(**obj_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# ==========================================
# EMPRESAS
# ==========================================

def obtener_empresas(db: Session, skip: int = 0, limit: int = 100):
    """Recupera todas las empresas dadas de alta en la plataforma."""
    return db.query(Empresa).offset(skip).limit(limit).all()

def crear_empresa(db: Session, obj_in: empresa.EmpresaCreate):
    """Guarda una nueva empresa en el sistema."""
    db_obj = Empresa(**obj_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# ==========================================
# FICHAJES
# ==========================================

def obtener_fichajes_por_trabajador_y_empresa(db: Session, trabajador_id: int, empresa_id: int):
    """Recupera el historial de marcajes de un empleado en una empresa específica."""
    return db.query(Fichaje).filter(
        Fichaje.idTrabajador == trabajador_id,
        Fichaje.idEmpresa == empresa_id
    ).order_by(Fichaje.fecha.asc()).all()

def crear_fichaje(db: Session, obj_in: fichaje.FichajeCreate):
    """Registra un evento de jornada calculando el tiempo actual en el servidor."""
    ahora = datetime.now()
    db_obj = Fichaje(
        idTrabajador=obj_in.idTrabajador,
        idEmpresa=obj_in.idEmpresa,
        tipo=obj_in.tipo,
        fecha=int(ahora.timestamp()),  # Genera la marca de tiempo numérica entera
        fecha_hora=ahora               # Almacena el objeto DateTime nativo
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# ==========================================
# VACACIONES
# ==========================================

def crear_solicitud_vacacion(db: Session, obj_in: vacacion.VacacionCreate):
    """Inserta una solicitud de vacaciones (el estado por defecto será 'pendiente')."""
    db_obj = Vacacion(**obj_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# ==========================================
# INCIDENCIAS
# ==========================================

def crear_reporte_incidencia(db: Session, obj_in: incidencia.IncidenciaCreate):
    """Inserta un reporte de incidencia (el estado por defecto será 'abierta')."""
    db_obj = Incidencia(**obj_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
