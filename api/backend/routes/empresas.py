from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import get_password_hash, obtener_usuario_actual, verificar_rol_requerido
from core.enums import TipoUsuarioEnum
from models.licencias import Licencias
from models.empresas import Empresas
from models.usuarios import Usuarios
from schemas.empresas import EmpresaCreate, EmpresaResponse, EmpresaUpdate, RegistroOrganizacionCompletaDTO, RespuestaRegistroCompletoDTO
from schemas.trabajadores import TrabajadorResponse
import shutil
import os
from fastapi import UploadFile, File
from models.trabajadores import Trabajadores
from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum

# APIRouter agrupa todos los endpoints relacionados con la gestión de empresas bajo el prefijo "/api/empresas".
router = APIRouter(prefix="/api/empresas", tags=["Empresas"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
# Esto previene ataques de fuerza bruta o saturación de peticiones en rutas críticas.
limiter = Limiter(key_func=get_remote_address)

CARPETA_LOGOS = "static/logos" 
os.makedirs(CARPETA_LOGOS, exist_ok=True)

@router.post("", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED, summary="Crear empresa")
@limiter.limit("10/minute")  
def crear_empresa(
    request: Request,
    obj_in: EmpresaCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA]))
):
    """
    **POST /api/empresas**
    
    Registra una nueva empresa en el sistema (restringido a administradores de gestoría).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de empresa desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    try:
        # 1. Verificar si la licencia existe y está libre
        licencia = db.query(Licencias).filter(Licencias.codigo == obj_in.codigo_licencia.strip().upper()).first()
        if not licencia:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El código de licencia introducido no existe."
            ) 
        
        if licencia.usada:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este código de licencia ya ha sido utilizado por otra empresa."
            )

        empresa_existente = db.query(Empresas).filter(Empresas.cif == obj_in.cif).first()
        if empresa_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una empresa registrada con el CIF ({obj_in.cif})."
            )

        nueva_empresa = Empresas(
            razon_social=obj_in.razon_social,
            cif=obj_in.cif,
            zona_horaria=obj_in.zona_horaria,
            configuracion=obj_in.configuracion,
            nombre_comercial=obj_in.nombre_comercial,
            codigo_cnae=obj_in.codigo_cnae,
            convenio_colectivo=obj_in.convenio_colectivo,
            direccion_fiscal=obj_in.direccion_fiscal
        )
        
        db.add(nueva_empresa)
        db.commit()
        db.refresh(nueva_empresa)

        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=nueva_empresa.id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "empresas", "accion": "crear", "entidad_id": str(nueva_empresa.id), "detalles": f"Se creó la empresa {nueva_empresa.razon_social}"}
        )

        return nueva_empresa

    except HTTPException as http_error:
        raise http_error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido crear la empresa: {str(error)}"
        )

@router.post("/registro-completo", response_model=RespuestaRegistroCompletoDTO, status_code=status.HTTP_201_CREATED, summary="Registro atómico de organización, trabajador y usuario admin")
@limiter.limit("10/minute") 
def registrar_organizacion_completa(
    request: Request,
    payload: RegistroOrganizacionCompletaDTO,
    db: Session = Depends(get_db)
):
    """
    **POST /api/empresas/registro-completo**
    
    Realiza una transacción atómica para dar de alta una nueva empresa, 
    su primer trabajador (administrador) y la cuenta de usuario vinculada. 
    Si algo falla, se revierte toda la operación (Rollback).
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de organización completa desde la IP: {cliente_ip}")

    try:
        # 1. Validar si la licencia existe y está disponible
        licencia = db.query(Licencias).filter(Licencias.codigo == payload.codigo_licencia.strip().upper()).first()
        if not licencia:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El código de licencia introducido no existe.")
        if licencia.usada:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este código de licencia ya ha sido utilizado.")

        # 2. Verificar que el CIF no esté registrado previamente
        empresa_existente = db.query(Empresas).filter(Empresas.cif == payload.cif.strip().upper()).first()
        if empresa_existente:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una empresa registrada con este CIF.")

        email_limpio = payload.email_admin.strip().lower()

        # 3. Verificar el estado del usuario por su email antes de operar
        usuario_existente = db.query(Usuarios).filter(Usuarios.email == email_limpio).first()
        if usuario_existente:
            if getattr(usuario_existente, "activo", True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="Ya existe un usuario activo registrado con este correo electrónico."
                )

        # 4. Crear la Empresa (Soportando tipo Gestoría o Empresa normal)
        nueva_empresa = Empresas(
            razon_social=payload.razon_social.strip(),
            nombre_comercial=payload.nombre_comercial.strip() if payload.nombre_comercial else None,
            cif=payload.cif.strip().upper(),
            direccion_fiscal=payload.direccion_fiscal.strip(),
            codigo_cnae=payload.codigo_cnae.strip() if payload.codigo_cnae else None,
            convenio_colectivo=payload.convenio_colectivo.strip() if payload.convenio_colectivo else None,
            logo_url=payload.logo_url,
            zona_horaria="Europe/Madrid",
            es_gestoria=getattr(payload, "es_gestoria", False),
            configuracion={}
        )
        db.add(nueva_empresa)
        db.flush() 

        # 5. Marcar la licencia como usada y asignarla a la empresa (Relación 1:1)
        licencia.usada = True
        licencia.empresa_id = nueva_empresa.id

        # 6. Crear el Trabajador asociado (Primer expediente)
        nuevo_trabajador = Trabajadores(
            empresa_id=nueva_empresa.id,
            dni_nif_nie=payload.dni_nif_nie_admin.strip().upper(),
            nombre=payload.nombre_admin.strip(),
            apellidos=payload.apellidos_admin.strip(),
            email=email_limpio,
            telefono=payload.telefono_admin.strip() if payload.telefono_admin else None,
            numero_seguridad_social=payload.nss_admin.strip() if payload.nss_admin else None,
            fecha_nacimiento=payload.fecha_nacimiento_admin
        )
        db.add(nuevo_trabajador)
        db.flush() 

        # 7. Gestionar el Usuario (Reutilizar si estaba inactivo o crear uno nuevo)
        rol_usuario = TipoUsuarioEnum.ADMIN_GESTORIA if getattr(payload, "es_gestoria", False) else TipoUsuarioEnum.ADMIN_EMPRESA

        if usuario_existente:
            usuario_existente.nombre = f"{payload.nombre_admin.strip()} {payload.apellidos_admin.strip()}"
            usuario_existente.password_hash = get_password_hash(payload.password_raw)
            usuario_existente.tipo_usuario = rol_usuario
            usuario_existente.empresa_id = nueva_empresa.id
            usuario_existente.trabajador_id = nuevo_trabajador.id
            usuario_existente.activo = True
            nuevo_usuario = usuario_existente
        else:
            nuevo_usuario = Usuarios(
                nombre=f"{payload.nombre_admin.strip()} {payload.apellidos_admin.strip()}",
                email=email_limpio,
                password_hash=get_password_hash(payload.password_raw),
                tipo_usuario=rol_usuario,
                empresa_id=nueva_empresa.id,
                trabajador_id=nuevo_trabajador.id,
                activo=True
            )
            db.add(nuevo_usuario)

        # 8. Consolidar transacción completa
        db.commit()
        
        db.refresh(nueva_empresa)
        db.refresh(nuevo_trabajador)
        db.refresh(nuevo_usuario)

        registrar_auditoria(
            db=db,
            request=request,
            usuario=nuevo_usuario,
            empresa_id=nueva_empresa.id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "empresas", "accion": "registro_completo", "entidad_id": str(nueva_empresa.id), "detalles": f"Se registró la organización completa para {nueva_empresa.razon_social}"}
        )

        return {
            "empresa": nueva_empresa,
            "trabajador": nuevo_trabajador,
            "usuario": nuevo_usuario
        }

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as error:
        db.rollback()
        print(f"Error crítico en registro completo: {str(error)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido procesar el alta de la organización. Se ha revertido la operación."
        )

@router.put("/{id_empresa}/razon-social", response_model=EmpresaResponse, summary="Cambiar razón social de empresa")
@limiter.limit("20/minute")  
def cambiar_razon_social_empresa(
    request: Request,
    id_empresa: UUID, 
    nueva_razon_social: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/empresas/{id_empresa}/razon-social**
    
    Modifica la razón social de una empresa existente.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de cambio de razón social para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para modificar la razón social de esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna empresa con el ID ({id_empresa})."
        )
    
    setattr(empresa, "razon_social", nueva_razon_social)
    setattr(empresa, "updated_at", datetime.now())
    
    try:
        db.commit()
        db.refresh(empresa)

        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=id_empresa,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "empresas", "accion": "cambiar_razon_social", "entidad_id": str(id_empresa), "detalles": f"Se cambió la razón social de la empresa {id_empresa}"}
        )

        return empresa
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido actualizar la razón social de la empresa: {str(error)}"
        )


@router.put("/{id_empresa}", response_model=EmpresaResponse, summary="Actualizar datos de empresa")
@limiter.limit("20/minute") 
def actualizar_datos_empresa(
    request: Request,
    id_empresa: UUID, 
    payload: EmpresaUpdate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/empresas/{id_empresa}**
    
    Actualiza los datos generales de una empresa en el sistema.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de actualización de datos para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes permisos para actualizar los datos de esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se ha encontrado ninguna empresa con el ID ({id_empresa})."
        )
    
    datos_actualizacion = payload.model_dump(exclude_unset=True)
    for key, value in datos_actualizacion.items():
        setattr(empresa, key, value)

    setattr(empresa, "updated_at", datetime.now())
    
    try:
        db.commit()
        db.refresh(empresa)

        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=id_empresa,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "empresas", "accion": "actualizar", "entidad_id": str(id_empresa), "detalles": f"Se actualizaron los datos de la empresa {id_empresa}"}
        )

        return empresa
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se han podido actualizar los datos de la empresa: {str(error)}"
        )

@router.put("/{id_empresa}/logo", response_model=EmpresaResponse, summary="Actualizar logo de empresa")
@limiter.limit("20/minute") 
async def actualizar_logo_empresa(
    request: Request,
    id_empresa: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(verificar_rol_requerido([TipoUsuarioEnum.ADMIN_GESTORIA, TipoUsuarioEnum.ADMIN_EMPRESA, TipoUsuarioEnum.RRHH]))
):
    """
    **PUT /api/empresas/{id_empresa}/logo**
    
    Sube y actualiza el logotipo oficial de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de actualización de logo para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    if usuario_actual.empresa_id and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No autorizado para modificar el logo de esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID ({id_empresa}) no encontrada."
        )

    assert file.filename is not None

    TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/jpg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"]
    
    if file.content_type not in TIPOS_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El archivo seleccionado no es una imagen válida (solo se permiten formatos JPEG, PNG, WEBP o ICO)."
        )

    extension = file.filename.split(".")[-1].lower()
    if extension not in ["png", "jpg", "jpeg", "webp", "ico", "svg"]:
        extension = "png"

    nombre_archivo = f"logo_{id_empresa}.{extension}"
    ruta_destino = os.path.join(CARPETA_LOGOS, nombre_archivo)

    with open(ruta_destino, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    ruta_relativa = f"/api/archivos/logos/{nombre_archivo}"

    empresa.logo_url = ruta_relativa
    empresa.updated_at = datetime.now()

    try:
        db.commit()
        db.refresh(empresa)

        registrar_auditoria(
            db=db,
            request=request,
            usuario=usuario_actual,
            empresa_id=id_empresa,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "empresas", "accion": "actualizar_logo", "entidad_id": str(id_empresa), "detalles": f"Se actualizó el logo de la empresa {id_empresa}"}
        )

        return empresa
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido guardar el logo de la empresa: {str(error)}"
        )

@router.get("", response_model=List[EmpresaResponse], summary="Obtener lista de empresas")
@limiter.limit("60/minute")  
def obtener_empresas(
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/empresas**
    
    Devuelve el catálogo de organizaciones aplicando aislamiento multi-tenant.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de empresas desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    query = db.query(Empresas)
    
    if usuario_actual.tipo_usuario != "Administrador":
        if not usuario_actual.empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No estás vinculado a ninguna empresa."
            )
        query = query.filter(Empresas.id == usuario_actual.empresa_id)

    resultados = query.order_by(Empresas.nombre_comercial.asc()).all()

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=usuario_actual.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "empresas", "accion": "consultar_lista", "detalles": "Se consultó el listado de empresas"}
    )

    return resultados


@router.get("/{id_empresa}", response_model=EmpresaResponse, summary="Obtener empresa por ID")
@limiter.limit("60/minute")  
def obtener_empresa(
    request: Request,
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/empresas/{id_empresa}**
    
    Obtiene los detalles completos de una empresa a partir de su ID único universal.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle de la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes autorización para consultar los datos de esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID ({id_empresa}) no encontrada."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "empresas", "accion": "consultar_por_id", "entidad_id": str(id_empresa), "detalles": f"Se consultó la empresa {id_empresa}"}
    )

    return empresa


@router.get("/cif/{cif_empresa}", response_model=EmpresaResponse, summary="Obtener empresa por CIF")
@limiter.limit("60/minute") 
def obtener_empresa_por_cif(
    request: Request,
    cif_empresa: str, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/empresas/cif/{cif_empresa}**
    
    Busca y devuelve los datos de una empresa filtrando directamente por su código CIF.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de empresa por CIF {cif_empresa} desde la IP: {cliente_ip}")

    empresa = db.query(Empresas).filter(Empresas.cif == cif_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con CIF ({cif_empresa}) no encontrada."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=empresa.id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "empresas", "accion": "consultar_por_cif", "detalles": f"Se consultó la empresa por CIF {cif_empresa}"}
    )

    return empresa


@router.get("/{id_empresa}/trabajadores", response_model=List[TrabajadorResponse], summary="Obtener trabajadores de empresa")
@limiter.limit("60/minute") 
def obtener_trabajadores_empresa(
    request: Request,
    id_empresa: UUID, 
    db: Session = Depends(get_db),
    usuario_actual: Usuarios = Depends(obtener_usuario_actual)
):
    """
    **GET /api/empresas/{id_empresa}/trabajadores**
    
    Devuelve la lista de trabajadores vinculados a una empresa específica.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de listado de trabajadores para la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    es_admin_gestoria = usuario_actual.tipo_usuario == TipoUsuarioEnum.ADMIN_GESTORIA
    if not es_admin_gestoria and usuario_actual.empresa_id != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. No tienes autorización para consultar los trabajadores de esta empresa."
        )

    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID ({id_empresa}) no encontrada."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario=usuario_actual,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "empresas", "accion": "consultar_trabajadores", "entidad_id": str(id_empresa), "detalles": f"Se consultaron los trabajadores de la empresa {id_empresa}"}
    )

    return sorted(empresa.trabajadores, key=lambda t: t.nombre)