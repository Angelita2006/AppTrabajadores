from datetime import datetime
import os
import shutil
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.asignaciones_turno import AsignacionesTurno
from models.usuarios_roles import UsuariosRoles
from core.database import get_db
from core.security import obtener_usuario_actual, verificar_rol_requerido, verify_password
from core.enums import TipoUsuarioEnum
from schemas.empresas import EmpresaResponse
from schemas.trabajadores import AsignarTurnosRequest, TrabajadorCreate, TrabajadorResponse, TrabajadorUpdate
from schemas.usuarios import LoginRequest
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from models.turnos import Turnos

# Configuración del enrutador para la gestión de trabajadores y expedientes de empleados
router = APIRouter(prefix="/api/trabajadores", tags=["Trabajadores"])

# Configuración del limitador de tasa de peticiones por IP para prevenir ataques de fuerza bruta y abusos
limiter = Limiter(key_func=get_remote_address)

CARPETA_FOTOS_TRABAJADORES = "static/fotos_trabajadores"
os.makedirs(CARPETA_FOTOS_TRABAJADORES, exist_ok=True)

@router.get("/empresa/{id_empresa}", response_model=List[TrabajadorResponse], summary="Obtener trabajadores por empresa")
@limiter.limit("60/minute") # Limita las consultas masivas de listados de empleados para proteger el rendimiento de la base de datos
def obtener_trabajadores_por_empresa(
    request: Request,
    id_empresa: UUID,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **GET /api/trabajadores/empresa/{id_empresa}**
    
    Recupera la lista de trabajadores de una empresa específica validando permisos de tenant.
    """
    # Registrar la dirección IP del cliente y trazas de auditoría de acceso
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de trabajadores de la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    # Validar aislamiento multi-tenant
    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para ver los trabajadores de esta empresa."
        )

    trabajadores = db.query(Trabajadores).options(
        joinedload(Trabajadores.empresa),
        joinedload(Trabajadores.rol)
    ).filter(Trabajadores.empresa_id == id_empresa).all()
    return trabajadores


@router.get("/{id_trabajador}", response_model=TrabajadorResponse, summary="Obtener trabajador por ID")
@limiter.limit("60/minute") # Limita las consultas individuales de expedientes para prevenir ataques de enumeración
def obtener_trabajador(
    request: Request,
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/trabajadores/{id_trabajador}**
    
    Busca los detalles de un empleado validando el acceso a su tenant.
    """
    # Registrar la dirección IP del cliente y trazas de auditoría
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle del trabajador {id_trabajador} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).options(
        joinedload(Trabajadores.empresa),
        joinedload(Trabajadores.rol)
    ).filter(Trabajadores.id == id_trabajador).first()
    
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no encontrado en el sistema."
        )

    # Validar permisos de acceso (pertenencia a empresa o ser el propio trabajador)
    if usuario_actual.empresa_id != trabajador.empresa_id:
        if not hasattr(usuario_actual, "trabajador_id") or usuario_actual.trabajador_id != id_trabajador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para consultar este expediente personal."
            )

    return trabajador


@router.get("/{id_trabajador}/empresa", response_model=EmpresaResponse, summary="Obtener empresa del trabajador")
@limiter.limit("60/minute") # Limita las consultas de vinculación empresarial de empleados
def obtener_empresa_trabajador(
    request: Request,
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/trabajadores/{id_trabajador}/empresa**
    
    Recupera la empresa vinculada al expediente validando permisos.
    """
    # Registrar la dirección IP del cliente y trazas de auditoría
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de empresa del trabajador {id_trabajador} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).options(
        joinedload(Trabajadores.empresa),
        joinedload(Trabajadores.rol)
    ).filter(Trabajadores.id == id_trabajador).first()
    
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no encontrado en el sistema."
        )
    
    if usuario_actual.empresa_id != trabajador.empresa_id:
        if not hasattr(usuario_actual, "trabajador_id") or usuario_actual.trabajador_id != id_trabajador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes autorización para ver las empresas vinculadas a este trabajador."
            )

    if not trabajador.empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El trabajador con ID {id_trabajador} no tiene una empresa asociada."
        )

    # Retorna directamente el objeto de la empresa, no una lista
    return trabajador.empresa


@router.post("", response_model=TrabajadorResponse, status_code=status.HTTP_201_CREATED, summary="Registrar trabajador")
@limiter.limit("15/minute") # Protegido frente a la creación masiva o automatizada de expedientes de empleados
def registrar_trabajador(
    request: Request,
    obj_in: TrabajadorCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **POST /api/trabajadores**
    
    Registra un nuevo empleado guardando su rol opcional y validando aislamientos.
    """
    # Registrar metadatos de red y auditoría de la creación
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de trabajador desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if obj_in.email:
        email_existente = db.query(Usuarios).filter(Usuarios.email == obj_in.email).first()
        if email_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electrónico ya se encuentra registrado en el sistema."
            )

    identidad_existente = db.query(Trabajadores).filter(
        Trabajadores.empresa_id == obj_in.empresa_id,
        Trabajadores.dni_nif_nie == obj_in.dni_nif_nie
    ).first()
    
    if identidad_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un trabajador registrado con este NIF/NIE dentro de la misma empresa."
        )

    # Creamos el trabajador incluyendo el rol_id recibido en el payload de creación
    nuevo_trabajador = Trabajadores(
        empresa_id=obj_in.empresa_id,
        dni_nif_nie=obj_in.dni_nif_nie,
        nombre=obj_in.nombre,
        apellidos=obj_in.apellidos,
        email=obj_in.email,
        telefono=obj_in.telefono,
        numero_seguridad_social=obj_in.numero_seguridad_social,
        fecha_nacimiento=obj_in.fecha_nacimiento,
        rol_id=obj_in.rol_id 
    )
    
    try:
        db.add(nuevo_trabajador)
        db.commit()
        
        trabajador_con_relacion = db.query(Trabajadores).options(
            joinedload(Trabajadores.empresa),
            joinedload(Trabajadores.rol)
        ).filter(Trabajadores.id == nuevo_trabajador.id).first()
        
        return trabajador_con_relacion
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al registrar el trabajador en la base de datos: {str(error)}"
        )


@router.post("/login", response_model=TrabajadorResponse, summary="Login de trabajador")
@limiter.limit("5/minute") # Altamente protegido frente a ataques de fuerza bruta en credenciales de acceso
def login_trabajador(
    request: Request, 
    credenciales: LoginRequest, 
    db: Session = Depends(get_db)
):
    """
    **POST /api/trabajadores/login**
    
    Valida las credenciales utilizando verificación segura de hash contra la tabla central de usuarios.
    """
    # Registrar IP del intento de inicio de sesión para control de seguridad
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Intento de login de trabajador desde la IP: {cliente_ip} con correo: {credenciales.email}")

    usuario_cuenta = db.query(Usuarios).filter(Usuarios.email == credenciales.email).first()

    if not usuario_cuenta or not verify_password(credenciales.password, str(usuario_cuenta.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El correo electrónico o la contraseña introducidos son incorrectos."
        )

    if not usuario_cuenta.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra desactivada temporalmente."
        )

    if not usuario_cuenta.trabajador_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Esta cuenta de acceso no tiene un expediente de empleado vinculado."
        )

    trabajador = db.query(Trabajadores).options(
        joinedload(Trabajadores.empresa),
        joinedload(Trabajadores.rol)
    ).filter(Trabajadores.id == usuario_cuenta.trabajador_id).first()

    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El expediente de empleado asociado no existe en el sistema."
        )

    return trabajador


@router.post("/turnos/{id_trabajador}", status_code=status.HTTP_200_OK, summary="Asignar turnos a trabajador")
@limiter.limit("15/minute") # Protegido frente a asignaciones masivas concurrentes o automatizadas
def asignar_turnos_trabajador(
    request: Request,
    id_trabajador: UUID, 
    obj_in: AsignarTurnosRequest, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **POST /api/trabajadores/turnos/{id_trabajador}**
    
    Asigna turnos masivamente a un trabajador validando el ámbito de la empresa.
    """
    # Registrar metadatos de red y auditoría de la asignación de turnos
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de asignación de turnos al trabajador {id_trabajador} desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no encontrado."
        )

    if usuario_actual.empresa_id != trabajador.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para asignar turnos a este trabajador de otra empresa."
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
                fecha_inicio=obj_in.fecha_inicio, 
                fecha_fin=obj_in.fecha_fin,
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


@router.patch("/{id_trabajador}", response_model=TrabajadorResponse, summary="Actualizar trabajador")
@limiter.limit("20/minute") # Protegido frente a actualizaciones masivas concurrentes
def actualizar_trabajador(
    request: Request,
    id_trabajador: UUID, 
    obj_in: TrabajadorUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PATCH /api/trabajadores/{id_trabajador}**
    
    Actualiza datos de un trabajador (incluyendo su rol) validando pertenencia a la empresa.
    """
    # Registrar metadatos de red y auditoría de la actualización
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de actualización del trabajador {id_trabajador} desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado en el sistema.")
    
    if usuario_actual.empresa_id != trabajador.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar este trabajador."
        )
    
    datos_actualizacion = obj_in.model_dump(exclude_unset=True)
    
    for field, value in datos_actualizacion.items():
        setattr(trabajador, field, value)
    
    try:
        db.commit()
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar los datos del trabajador: {str(error)}"
        )

    # Sincronización opcional: Si el trabajador ya tiene cuenta de usuario vinculada y se actualizó su rol, 
    # actualizamos también su rol en la tabla relacional de accesos (usuarios_roles) si aplica en tu arquitectura.
    if "rol_id" in datos_actualizacion and trabajador.email:
        usuario_asociado = db.query(Usuarios).filter(Usuarios.email == trabajador.email).first()
        if usuario_asociado:
            ur_existente = db.query(UsuariosRoles).filter(
                UsuariosRoles.usuario_id == usuario_asociado.id,
                UsuariosRoles.empresa_id == trabajador.empresa_id
            ).first()
            if trabajador.rol_id:
                if ur_existente:
                    ur_existente.rol_id = trabajador.rol_id
                else:
                    nuevo_ur = UsuariosRoles(
                        usuario_id=usuario_asociado.id,
                        rol_id=trabajador.rol_id,
                        empresa_id=trabajador.empresa_id
                    )
                    db.add(nuevo_ur)
            else:
                if ur_existente:
                    db.delete(ur_existente)
            try:
                db.commit()
            except Exception:
                db.rollback()

    trabajador_actualizado = db.query(Trabajadores).options(
        joinedload(Trabajadores.empresa),
        joinedload(Trabajadores.rol)
    ).filter(Trabajadores.id == id_trabajador).first()

    return trabajador_actualizado


@router.put("/{id_trabajador}/foto", response_model=TrabajadorResponse, summary="Actualizar foto de trabajador")
@limiter.limit("20/minute") # Protegido frente a la subida masiva de archivos para evitar saturación de almacenamiento
async def actualizar_foto_trabajador(
    request: Request,
    id_trabajador: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **PUT /api/trabajadores/{id_trabajador}/foto**
    
    Sube y actualiza la fotografía de perfil de un trabajador.
    """
    # Registrar metadatos de red y auditoría de la subida de foto
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de subida de foto para el trabajador {id_trabajador} desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado en el sistema.")

    assert file.filename is not None

    TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type not in TIPOS_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El archivo seleccionado no es una imagen válida (formatos permitidos: JPEG, PNG, JPG, WEBP)."
        )

    extension = file.filename.split(".")[-1].lower()
    if extension not in ["png", "jpg", "jpeg", "webp"]:
        extension = "png"

    nombre_archivo = f"trabajador_{id_trabajador}.{extension}"
    ruta_destino = os.path.join(CARPETA_FOTOS_TRABAJADORES, nombre_archivo)

    try:
        with open(ruta_destino, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el archivo de imagen en el servidor: {str(error)}"
        )

    ruta_relativa = f"/static/fotos_trabajadores/{nombre_archivo}"
    trabajador.foto_url = ruta_relativa
    trabajador.updated_at = datetime.now()

    try:
        db.commit()
        
        trabajador_con_foto = db.query(Trabajadores).options(
            joinedload(Trabajadores.empresa),
            joinedload(Trabajadores.rol)
        ).filter(Trabajadores.id == id_trabajador).first()
        
        return trabajador_con_foto
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al actualizar la URL de la foto en la base de datos: {str(error)}")


@router.delete("/{id_trabajador}", status_code=status.HTTP_200_OK, summary="Eliminar trabajador")
@limiter.limit("20/minute") # Protegido frente a eliminaciones masivas destructivas de expedientes
def eliminar_trabajador(
    request: Request,
    id_trabajador: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **DELETE /api/trabajadores/{id_trabajador}**
    
    Elimina un trabajador validando privilegios de administración o empresa.
    """
    # Registrar metadatos de red y auditoría de la eliminación
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de eliminación del trabajador {id_trabajador} desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no localizado en el sistema."
        )

    if usuario_actual.empresa_id != trabajador.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar este trabajador perteneciente a otra empresa."
        )
    
    try:
        db.delete(trabajador)
        db.commit()
        return {"detail": f"Trabajador con ID {id_trabajador} eliminado correctamente junto con su planificación en cascada."}
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el trabajador debido a restricciones de integridad referencial. Error: {str(error)}"
        )