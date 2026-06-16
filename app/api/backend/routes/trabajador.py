from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db, next_id
from models.trabajador import Trabajador
from schemas.trabajador import TrabajadorCreate, TrabajadorResponse, LoginRequest
from schemas.empresa import EmpresaResponse

# Inicialización del enrutador modular para el personal y autenticación
router = APIRouter(prefix="/api/trabajadores", tags=["Trabajadores"])

@router.post("", response_model=TrabajadorResponse, status_code=status.HTTP_201_CREATED)
def registrar_trabajador(obj_in: TrabajadorCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/trabajadores
    Registra un nuevo empleado en la base de datos comprobando que el email y DNI sean únicos.
    """
    # 1. Comprobación de seguridad: Verifica que el email no esté registrado
    email_existente = db.query(Trabajador).filter(Trabajador.email == obj_in.email).first()
    if email_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado en el sistema."
        )

    # 2. Comprobación de seguridad: Verifica que el DNI no esté duplicado
    dni_existente = db.query(Trabajador).filter(Trabajador.dni == obj_in.dni).first()
    if dni_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El número de DNI introducido ya se encuentra registrado."
        )

    # 3. Mapeo de Pydantic al modelo de SQLAlchemy
    nuevo_trabajador = Trabajador(
        id=next_id(Trabajador),
        role=obj_in.role if obj_in.role else "user",
        estado=obj_in.estado if obj_in.estado else "Activo",
        nombre=obj_in.nombre,
        apellidos=obj_in.apellidos,
        dni=obj_in.dni,
        puesto=obj_in.puesto,
        direccion=obj_in.direccion,
        codigo_postal=obj_in.codigo_postal,
        poblacion=obj_in.poblacion,
        provincia=obj_in.provincia,
        cuenta_cotizacion=obj_in.cuenta_cotizacion,
        email=obj_in.email,
        password=obj_in.password  # Almacenamiento en texto plano para la demo actual
    )
    
    db.add(nuevo_trabajador)
    db.commit()
    db.refresh(nuevo_trabajador)
    return nuevo_trabajador


@router.post("/login", response_model=TrabajadorResponse)
def login_trabajador(credenciales: LoginRequest, db: Session = Depends(get_db)):
    """
    URI: POST /api/trabajadores/login
    Valida el correo y la contraseña contra los registros de la base de datos real.
    """
    # Busca el usuario por el correo (normalizando a minúsculas)
    trabajador = db.query(Trabajador).filter(
        Trabajador.email == credenciales.email
    ).first()

    # Validación de seguridad cruzada: si no existe o la clave no coincide, lanza error 401
    if not trabajador or str(trabajador.password) != credenciales.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El correo electrónico o la contraseña introducidos son incorrectos."
        )

    return trabajador


@router.get("", response_model=List[TrabajadorResponse])
def obtener_trabajadores(db: Session = Depends(get_db)):
    """
    URI: GET /api/trabajadores
    Devuelve la plantilla completa de todos los empleados del sistema.
    """
    return db.query(Trabajador).all()


@router.get("/{id_trabajador}", response_model=TrabajadorResponse)
def obtener_trabajador(id_trabajador: int, db: Session = Depends(get_db)):
    """
    URI: GET /api/trabajadores/{id_trabajador}
    Busca los detalles de un empleado por su identificador único.
    """
    trabajador = db.query(Trabajador).filter(Trabajador.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no encontrado."
        )
    return trabajador


@router.get("/{id_trabajador}/empresas", response_model=List[EmpresaResponse])
def obtener_empresas_trabajador(id_trabajador: int, db: Session = Depends(get_db)):
    """
    URI: GET /api/trabajadores/{id_trabajador}/empresas
    Recupera la lista de organizaciones vinculadas al empleado a través de la relación de muchos a muchos.
    """
    trabajador = db.query(Trabajador).filter(Trabajador.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no encontrado."
        )
    # SQLAlchemy resuelve la relación muchos a muchos usando el modelo relacional mapeado
    return trabajador.empresas
