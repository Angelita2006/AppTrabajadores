from datetime import date, datetime
import os
import shutil
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.contratos import Contratos
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
from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum
from sqlalchemy import func


# Configuración del enrutador para la gestión de trabajadores y expedientes de empleados
router = APIRouter(prefix="/api/trabajadores", tags=["Trabajadores"])

# Configuración del limitador de tasa de peticiones por IP para prevenir ataques de fuerza bruta y abusos
limiter = Limiter(key_func=get_remote_address)

CARPETA_FOTOS_TRABAJADORES = "static/fotos_trabajadores"
os.makedirs(CARPETA_FOTOS_TRABAJADORES, exist_ok=True)

@router.get("/empresa/{id_empresa}", response_model=List[TrabajadorResponse], summary="Obtener trabajadores por empresa")
@limiter.limit("60/minute") 
def obtener_trabajadores_por_empresa(
    request: Request,
    id_empresa: UUID,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
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
    ).filter(Trabajadores.empresa_id == id_empresa, Trabajadores.activo.is_(True)).all()

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "trabajadores", "accion": "obtener_por_empresa", "entidad_id": str(id_empresa), "detalles": f"Se consultó el listado de trabajadores de la empresa {id_empresa}"}
    )
    db.commit()

    return trabajadores


@router.get("/{id_trabajador}", response_model=TrabajadorResponse, summary="Obtener trabajador por ID")
@limiter.limit("60/minute") 
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

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "trabajadores", "accion": "obtener_por_id", "entidad_id": str(id_trabajador), "detalles": f"Se consultó el expediente del trabajador {id_trabajador}"}
    )
    db.commit()

    return trabajador


@router.get("/{id_trabajador}/empresa", response_model=EmpresaResponse, summary="Obtener empresa del trabajador")
@limiter.limit("60/minute") 
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

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "trabajadores", "accion": "obtener_empresa", "entidad_id": str(id_trabajador), "detalles": f"Se consultó la empresa vinculada al trabajador {id_trabajador}"}
    )
    db.commit()

    return trabajador.empresa


@router.post("", response_model=TrabajadorResponse, status_code=status.HTTP_201_CREATED, summary="Registrar trabajador")
@limiter.limit("15/minute")
def registrar_trabajador(
    request: Request,
    obj_in: TrabajadorCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **POST /api/trabajadores**
    
    Registra un nuevo empleado guardando su rol opcional y validando aislamientos.
    """
    # Registrar metadatos de red y auditoría de la creación
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de trabajador desde IP: {cliente_ip}")

    email_limpio = str(obj_in.email).strip().lower() if obj_in.email else None
    if email_limpio:
        email_trabajador_existente = db.query(Trabajadores).filter(
            Trabajadores.email == email_limpio,
            Trabajadores.activo.is_(True),
        ).first()
        email_usuario_existente = db.query(Usuarios).filter(
            Usuarios.email == email_limpio,
            Usuarios.activo.is_(True),
        ).first()
        if email_trabajador_existente or email_usuario_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electrónico ya está asignado a otro trabajador activo."
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
        email=email_limpio,
        telefono=obj_in.telefono,
        numero_seguridad_social=obj_in.numero_seguridad_social,
        fecha_nacimiento=obj_in.fecha_nacimiento,
        rol_id=obj_in.rol_id 
    )
    
    try:
        db.add(nuevo_trabajador)
        db.flush()

        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=obj_in.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "trabajadores", "accion": "registrar", "entidad_id": str(nuevo_trabajador.id), "detalles": f"Se registró el trabajador {nuevo_trabajador.id}"}
        )

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
            detail=f"No se ha podido registrar el trabajador en la base de datos: {str(error)}"
        )


@router.post("/login", response_model=TrabajadorResponse, summary="Login de trabajador")
@limiter.limit("5/minute") 
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

    usuario_cuenta = db.query(Usuarios).filter(
        Usuarios.email == str(credenciales.email).strip().lower(),
        Usuarios.activo.is_(True),
    ).first()

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

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_cuenta,
        empresa_id=trabajador.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "trabajadores", "accion": "login", "entidad_id": str(trabajador.id), "detalles": f"Inicio de sesión del trabajador {trabajador.id}"}
    )
    db.commit()

    return trabajador


@router.post("/turnos/{id_trabajador}", status_code=status.HTTP_200_OK, summary="Asignar turnos a trabajador")
@limiter.limit("15/minute") 
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

        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "trabajadores", "accion": "asignar_turnos", "entidad_id": str(id_trabajador), "detalles": f"Se asignaron {len(nuevas_asignaciones)} turnos al trabajador {id_trabajador}"}
        )

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
            detail=f"No se ha podido procesar la asignación múltiple de turnos: {str(error)}"
        )


@router.patch("/{id_trabajador}", response_model=TrabajadorResponse, summary="Actualizar trabajador")
@limiter.limit("20/minute")
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

    if "email" in datos_actualizacion:
        email_nuevo = datos_actualizacion["email"]
        email_nuevo = str(email_nuevo).strip().lower() if email_nuevo else None
        datos_actualizacion["email"] = email_nuevo
        if email_nuevo:
            email_trabajador_existente = db.query(Trabajadores).filter(
                Trabajadores.email == email_nuevo,
                Trabajadores.activo.is_(True),
                Trabajadores.id != id_trabajador,
            ).first()
            usuario_asociado_actual = db.query(Usuarios).filter(
                Usuarios.trabajador_id == id_trabajador,
            ).first()
            email_usuario_existente = db.query(Usuarios).filter(
                Usuarios.email == email_nuevo,
                Usuarios.activo.is_(True),
                Usuarios.id != getattr(usuario_asociado_actual, "id", None),
            ).first()
            if email_trabajador_existente or email_usuario_existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El correo electrónico ya está asignado a otro trabajador activo."
                )
    
    for field, value in datos_actualizacion.items():
        setattr(trabajador, field, value)
    
    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "trabajadores", "accion": "actualizar", "entidad_id": str(id_trabajador), "detalles": f"Se actualizó el trabajador {id_trabajador}"}
        )
        db.commit()
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se han podido actualizar los datos del trabajador: {str(error)}"
        )

    # Mantener la cuenta de acceso vinculada al expediente, aunque cambie el correo.
    if "email" in datos_actualizacion or "rol_id" in datos_actualizacion:
        usuario_asociado = db.query(Usuarios).filter(Usuarios.trabajador_id == id_trabajador).first()
        if usuario_asociado:
            if datos_actualizacion.get("email"):
                usuario_asociado.email = str(datos_actualizacion["email"])
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
@limiter.limit("20/minute")
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
            detail=f"No se ha podido guardar el archivo de imagen en el servidor: {str(error)}"
        )

    ruta_relativa = f"/api/archivos/fotos_trabajadores/{nombre_archivo}"
    trabajador.foto_url = ruta_relativa
    trabajador.updated_at = datetime.now()

    try:
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "trabajadores", "accion": "actualizar_foto", "entidad_id": str(id_trabajador), "detalles": f"Se actualizó la foto del trabajador {id_trabajador}"}
        )
        db.commit()
        
        trabajador_con_foto = db.query(Trabajadores).options(
            joinedload(Trabajadores.empresa),
            joinedload(Trabajadores.rol)
        ).filter(Trabajadores.id == id_trabajador).first()
        
        return trabajador_con_foto
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"No se ha podido actualizar la URL de la foto en la base de datos: {str(error)}")

@router.post("/{id_trabajador}/baja-total", status_code=status.HTTP_200_OK, summary="Baja total y coordinada de un trabajador")
@limiter.limit("10/minute")
def baja_total_trabajador(
    request: Request,
    id_trabajador: UUID,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **POST /api/trabajadores/{id_trabajador}/baja-total**
    
    Realiza una transacción atómica para tramitar la baja completa de un trabajador:
    - Marca al trabajador como inactivo y registra su fecha de baja.
    - Rescinde o finaliza sus contratos activos.
    - Inactiva o desvincula su cuenta de usuario de sesión para liberar su correo.
    - Limpia asignaciones asociadas (turnos, roles, etc.).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de tramitación de baja para el trabajador {id_trabajador} desde IP: {cliente_ip} por el usuario: {usuario_actual.email}")
    

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(status_code=404, detail=f"Trabajador con ID {id_trabajador} no encontrado.")

    if usuario_actual.empresa_id != trabajador.empresa_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar trabajadores de otra empresa.")

    try:
        fecha_actual = date.today()

        # 1. Actualizar estado del trabajador
        trabajador.activo = False
        trabajador.fecha_baja_empresa = fecha_actual

        # 2. Rescindir contrato activo (Ajusta según tu modelo de contratos)
        contratos_activos = db.query(Contratos).filter(
            Contratos.trabajador_id == id_trabajador,
            Contratos.activo == True
        ).all()
        for contrato in contratos_activos:
            contrato.activo = False
            contrato.fecha_fin = fecha_actual

        # 3. Inactivar la cuenta vinculada. Se conserva la relación histórica.
        usuario_asociado = db.query(Usuarios).filter(Usuarios.trabajador_id == id_trabajador).first()
        if usuario_asociado:
            usuario_asociado.activo = False

        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=trabajador.empresa_id,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "trabajadores", "accion": "baja_total", "entidad_id": str(id_trabajador), "detalles": f"Se procesó la baja total del trabajador {id_trabajador}"}
        )

        db.commit()
        return {"detail": f"Baja total procesada correctamente para el trabajador {id_trabajador}."}

    except Exception as error:
        db.rollback()
        print(f"No se ha podido procesar la baja total de trabajador: {str(error)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido tramitar la baja total. Se ha revertido la operación."
        )

@router.delete("/{id_trabajador}", status_code=status.HTTP_200_OK, summary="Eliminar trabajador")
@limiter.limit("20/minute") 
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
        empresa_id_aux = trabajador.empresa_id
        db.delete(trabajador)
        
        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=empresa_id_aux,
            accion=AccionAuditoriaEnum.ELIMINACION,
            detalle={"recurso": "trabajadores", "accion": "eliminar", "entidad_id": str(id_trabajador), "detalles": f"Se eliminó el trabajador {id_trabajador}"}
        )

        db.commit()
        return {"detail": f"Trabajador con ID {id_trabajador} eliminado correctamente junto con su planificación en cascada."}
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el trabajador debido a restricciones de integridad referencial. Error: {str(error)}"
        )

@router.get("/{id_trabajador}/verificar-login-hoy", response_model=bool, summary="Verificar si un trabajador ha hecho login hoy")
@limiter.limit("60/minute")
def verificar_si_se_ha_logueado_hoy(
    request: Request,
    id_trabajador: UUID,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/trabajadores/verificar-login-hoy/{id_trabajador}**
    
    Verifica si el trabajador ha registrado algún acceso o actividad el día de hoy.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de verificación de login para el trabajador {id_trabajador} desde IP: {cliente_ip}")

    trabajador = db.query(Trabajadores).filter(Trabajadores.id == id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {id_trabajador} no encontrado."
        )

    if usuario_actual.empresa_id != trabajador.empresa_id:
        if not hasattr(usuario_actual, "trabajador_id") or usuario_actual.trabajador_id != id_trabajador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para verificar esta información."
            )

    try:
        hoy = date.today()

        usuario_trabajador = db.query(Usuarios).filter(Usuarios.trabajador_id == trabajador.id).first()

        if not usuario_trabajador:
            return False
        
        if usuario_trabajador.ultimo_acceso:
            return usuario_trabajador.ultimo_acceso.date() == hoy
        
        return False

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar el registro de acceso: {str(error)}"
        )