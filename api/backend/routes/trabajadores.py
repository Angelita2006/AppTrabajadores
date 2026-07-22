from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from slowapi import Limiter
from slowapi.util import get_remote_address

from models.asignaciones_turno import AsignacionesTurno
from core.database import get_db
from core.security import obtener_usuario_actual, verify_password
from schemas.empresas import EmpresaResponse
from schemas.trabajadores import AsignarTurnosRequest, TrabajadorCreate, TrabajadorResponse
from schemas.usuarios import LoginRequest
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from models.turnos import Turnos

router = APIRouter(prefix="/api/trabajadores", tags=["Trabajadores"])

# Instancia local del limitador para este router
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=TrabajadorResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("15/minute")  # Protegido contra altas masivas de empleados
def registrar_trabajador(
    request: Request,
    obj_in: TrabajadorCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/trabajadores
    Registra un nuevo empleado validando el aislamiento por empresa y privilegios de administrador.
    """
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != obj_in.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar trabajadores en esta empresa."
        )

    if obj_in.email:
        email_existente = db.query(Usuarios).filter(Usuarios.email == obj_in.email).first()
        if email_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electrónico ya se encuentra registrado en el sistema."
            )

    identidad_existente = db.query(Trabajadores).filter(
        Trabajadores.empresa_id == obj_in.empresa_id,
        Trabajadores.nif_nie == obj_in.nif_nie
    ).first()
    
    if identidad_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un trabajador registrado con este NIF/NIE dentro de la misma empresa."
        )

    nuevo_trabajador = Trabajadores(
        empresa_id=obj_in.empresa_id,
        nif_nie=obj_in.nif_nie,
        nombre=obj_in.nombre,
        apellidos=obj_in.apellidos,
        email=obj_in.email,
    )
    
    db.add(nuevo_trabajador)
    db.commit()
    db.refresh(nuevo_trabajador)
    return nuevo_trabajador


@router.patch("/{id_trabajador}", response_model=TrabajadorResponse)
def actualizar_trabajador(
    id_trabajador: UUID, 
    obj_in: dict, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: PATCH /api/trabajadores/{id_trabajador}
    Actualiza datos de un trabajador validando pertenencia a la empresa o rol de administrador.
    """
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != trabajador.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar este trabajador."
        )
    
    for field, value in obj_in.items():
        setattr(trabajador, field, value)
    
    db.commit()
    db.refresh(trabajador)
    return trabajador


@router.post("/login", response_model=TrabajadorResponse)
@limiter.limit("5/minute")  # Protegido estrictamente contra ataques de fuerza bruta en accesos de empleados
def login_trabajador(request: Request, credenciales: LoginRequest, db: Session = Depends(get_db)):
    """
    URI: POST /api/trabajadores/login
    Valida las credenciales utilizando verificación segura de hash contra la tabla central de usuarios.
    """
    usuario_cuenta = db.query(Usuarios).filter(Usuarios.email == credenciales.email).first()

    if not usuario_cuenta or not verify_password(credenciales.password, str(usuario_cuenta.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El correo electrónico o la contraseña introducidos son incorrectos."
        )

    if not usuario_cuenta.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra desactivada."
        )

    if not usuario_cuenta.trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Esta cuenta de acceso no tiene un expediente de empleado vinculado."
        )

    return usuario_cuenta.trabajador


@router.get("", response_model=List[TrabajadorResponse])
def obtener_trabajadores(
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/trabajadores
    Devuelve la plantilla de empleados aplicando aislamiento multi-tenant.
    """
    query = db.query(Trabajadores)
    
    if usuario_actual.tipo_usuario != "Administrador":
        if not usuario_actual.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No estás vinculado a ninguna empresa."
            )
        query = query.filter(Trabajadores.empresa_id == usuario_actual.empresa_id)

    return query.order_by(Trabajadores.nombre.asc()).all()


@router.get("/{id_trabajador}", response_model=TrabajadorResponse)
def obtener_trabajador(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/trabajadores/{id_trabajador}
    Busca los detalles de un empleado validando el acceso a su tenant.
    """
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no encontrado."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != trabajador.empresa_id:
        if usuario_actual.trabajador_id != id_trabajador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para consultar este expediente."
            )

    return trabajador


@router.get("/{id_trabajador}/empresas", response_model=List[EmpresaResponse])
def obtener_empresas_trabajador(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: GET /api/trabajadores/{id_trabajador}/empresas
    Recupera la empresa vinculada al expediente validando permisos.
    """
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no encontrado."
        )
    
    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != trabajador.empresa_id:
        if usuario_actual.trabajador_id != id_trabajador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes autorización para ver las empresas de este trabajador."
            )

    if trabajador.empresa:
        return [trabajador.empresa]
    return []


@router.delete("/{id_trabajador}", status_code=status.HTTP_200_OK)
def eliminar_trabajador(
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: DELETE /api/trabajadores/{id_trabajador}
    Elimina un trabajador validando privilegios de administración o empresa.
    """
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no localizado."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != trabajador.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar este trabajador."
        )
    
    db.delete(trabajador)
    db.commit()
    return {"detail": f"Trabajador ({id_trabajador}) eliminado correctamente junto con su planificación en cascada."}


@router.post("/{id_trabajador}/turnos", status_code=status.HTTP_200_OK)
@limiter.limit("15/minute")  # Protegido frente a asignaciones masivas concurrentes abusivas
def asignar_turnos_trabajador(
    request: Request,
    id_trabajador: UUID, 
    obj_in: AsignarTurnosRequest, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    URI: POST /api/trabajadores/{id_trabajador}/turnos
    Asigna turnos masivamente a un trabajador validando el ámbito de la empresa.
    """
    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no encontrado."
        )

    if usuario_actual.tipo_usuario != "Administrador" and usuario_actual.empresa_id != trabajador.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para asignar turnos a este trabajador."
        )

    try:
        nuevas_asignaciones = []
        for turno_id in obj_in.turnos:
            turno_existe = db.query(Turnos).filter(Turnos.id == turno_id).first()
            if not turno_existe:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"El turno con ID {turno_id} no existe en el catálogo."
                )
            
            nueva_asignacion = AsignacionesTurno(
                trabajador_id=id_trabajador,
                turno_id=turno_id,
            )
            db.add(nueva_asignacion)
            nuevas_asignaciones.append(nueva_asignacion)

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