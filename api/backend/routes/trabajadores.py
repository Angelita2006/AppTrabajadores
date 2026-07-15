from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from models.asignaciones_turno import AsignacionesTurno
from core.database import get_db
from schemas.empresas import EmpresaResponse
from schemas.trabajadores import AsignarTurnosRequest, TrabajadorCreate, TrabajadorResponse
from schemas.usuarios import LoginRequest
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from models.turnos import Turnos

# Inicialización del enrutador modular para el personal y autenticación
router = APIRouter(prefix="/api/trabajadores", tags=["Trabajadores"])

@router.post("", response_model=TrabajadorResponse, status_code=status.HTTP_201_CREATED)
def registrar_trabajador(obj_in: TrabajadorCreate, db: Session = Depends(get_db)):
    """
    URI: POST /api/trabajadores
    Registra un nuevo empleado en la base de datos comprobando el aislamiento de identidad por empresa.
    """
    # 1. Comprobación de seguridad: Valida el correo electrónico único global en la tabla de usuarios
    if obj_in.email:
        email_existente = db.query(Usuarios).filter(Usuarios.email == obj_in.email).first()
        if email_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electrónico ya se encuentra registrado en el sistema."
            )

    # 2. Comprobación de seguridad: Valida la restricción única compuesta (empresa_id + nif_nie)
    identidad_existente = db.query(Trabajadores).filter(
        Trabajadores.empresa_id == obj_in.empresa_id,
        Trabajadores.nif_nie == obj_in.nif_nie
    ).first()
    
    if identidad_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un trabajador registrado con este NIF/NIE dentro de la misma empresa."
        )

    # 3. Mapeo de datos directo al modelo físico de SQLAlchemy (el ID lo genera la base de datos)
    nuevo_trabajador = Trabajadores(
        empresa_id=obj_in.empresa_id,
        nif_nie=obj_in.nif_nie,
        nombre=obj_in.nombre,
        apellidos=obj_in.apellidos,
        email=obj_in.email,
        telefono=obj_in.telefono,
        numero_seguridad_social=obj_in.numero_seguridad_social,
        fecha_nacimiento=obj_in.fecha_nacimiento
    )
    
    db.add(nuevo_trabajador)
    db.commit()
    db.refresh(nuevo_trabajador)
    return nuevo_trabajador

@router.post("/login", response_model=TrabajadorResponse)
def login_trabajador(credenciales: LoginRequest, db: Session = Depends(get_db)):
    """
    URI: POST /api/trabajadores/login
    Valida las credenciales contra la tabla central de cuentas de usuario de la plataforma.
    """
    # Busca la cuenta del usuario en la tabla central de accesos por su email
    usuario_cuenta = db.query(Usuarios).filter(Usuarios.email == credenciales.email).first()

    # Validación de seguridad: Comprueba el hash y la vigencia operativa de la cuenta
    if not usuario_cuenta or str(usuario_cuenta.password_hash) != credenciales.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El correo electrónico o la contraseña introducidos son incorrectos."
        )

    if not usuario_cuenta.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra desactivada."
        )

    # Verifica que el usuario cuente con un expediente de trabajador asociado
    if not usuario_cuenta.trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Esta cuenta de acceso no tiene un expediente de empleado vinculado."
        )

    # Devuelve el objeto del trabajador asociado para cargar el perfil en React Native
    return usuario_cuenta.trabajador

@router.get("", response_model=List[TrabajadorResponse])
def obtener_trabajadores(db: Session = Depends(get_db)):
    """
    URI: GET /api/trabajadores
    Devuelve la plantilla completa de todos los empleados del sistema.
    """
    return db.query(Trabajadores).order_by(Trabajadores.nombre.asc()).all()

@router.get("/{id_trabajador}", response_model=TrabajadorResponse)
def obtener_trabajador(id_trabajador: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/trabajadores/{id_trabajador}
    Busca los detalles de un empleado mediante su identificador único UUID.
    """
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no encontrado."
        )
    return trabajador

@router.get("/{id_trabajador}/empresas", response_model=List[EmpresaResponse])
def obtener_empresas_trabajador(id_trabajador: UUID, db: Session = Depends(get_db)):
    """
    URI: GET /api/trabajadores/{id_trabajador}/empresas
    Recupera la empresa principal asignada al expediente del empleado.
    """
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no encontrado."
        )
    
    # Devuelve la empresa vinculada en una lista para mantener la compatibilidad con el frontend
    if trabajador.empresa:
        return [trabajador.empresa]
    return []

@router.delete("/{id_trabajador}", status_code=status.HTTP_200_OK)
def eliminar_trabajador(id_trabajador: UUID, db: Session = Depends(get_db)):
    """
    URI: DELETE /api/trabajadores/{id_trabajador}
    Elimina físicamente un trabajador. Si se borra, las asignaciones ligadas se eliminan automáticamente (CASCADE).
    """
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no localizado."
        )
    
    db.delete(trabajador)
    db.commit()
    return {"detail": f"Trabajador ({id_trabajador}) eliminado correctamente junto con su planificación en cascada."}

@router.post("/{id_trabajador}/turnos", status_code=status.HTTP_200_OK)
def asignar_turnos_trabajador(
    id_trabajador: UUID, 
    obj_in: AsignarTurnosRequest, 
    db: Session = Depends(get_db)
):
    """
    URI: POST /api/trabajadores/{id_trabajador}/turnos
    Procesa de manera masiva la asignación o reasignación de múltiples turnos independientes 
    para un expediente de trabajador específico.
    """
    # 1. Validación de seguridad: Verificar que el trabajador exista
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no encontrado."
        )

    try:
        # 3. Registrar de forma independiente cada turno del array recibido
        nuevas_asignaciones = []
        for turno_id in obj_in.turnos:
            # Validar que el turno maestro realmente exista en el catálogo general
            turno_existe = db.query(Turnos).filter(Turnos.id == turno_id).first()
            if not turno_existe:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"El turno con ID {turno_id} no existe en el catálogo."
                )
            
            # Crear el registro independiente de la asignación
            nueva_asignacion = AsignacionesTurno(
                trabajador_id=id_trabajador,
                turno_id=turno_id,
                # Aquí puedes añadir campos adicionales si tu tabla los requiere (ej: fecha_inicio, semana, etc.)
            )
            db.add(nueva_asignacion)
            nuevas_asignaciones.append(nueva_asignacion)

        # 4. Consolidar los cambios en la base de datos
        db.commit()

        return {
            "status": "success",
            "detail": f"Se han asignado exitosamente {len(nuevas_asignaciones)} turnos al trabajador.",
            "trabajador_id": id_trabajador,
            "turnos_asignados": obj_in.turnos
        }

    except HTTPException as http_error:
        db.rollback()
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error crítico al procesar la asignación múltiple de turnos: {str(error)}"
        )