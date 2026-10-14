import os
import shutil
from datetime import date, datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.core.archivos import CARPETA_LOGOS_EMPRESAS
from backend.models.gestorias_empresas import GestoriasEmpresas
from backend.models.usuarios_empresas import UsuariosEmpresas
from core.auditoria import registrar_auditoria
from core.database import get_db
from core.enums import (
    AccionAuditoriaEnum,
    AccionPermisoEnum,
    EstadoSuscripcionEnum,
    TipoPermisoEnum,
    TipoRolEnum,
)
from core.security import (
    get_db_with_advanced_security,
    get_password_hash,
    verificar_permisos_requeridos,
)
from models.empresas import Empresas
from models.licencias import Licencias
from models.roles import Roles
from models.usuarios import Usuarios
from schemas.empresas import EmpresaSimpleResponse, EmpresaUpdate
from schemas.registro_organizacion import (
    RegistroOrganizacionCompleta,
    RespuestaRegistroCompletoDTO,
)
from schemas.trabajadores import TrabajadorResponse

# APIRouter agrupa todos los endpoints relacionados con la gestión de empresas bajo el prefijo "/api/empresas".
router = APIRouter(prefix="/api/empresas", tags=["Empresas"])

# Configuración del limitador de tasa (Rate Limiting) basado en la dirección IP remota del cliente.
limiter = Limiter(key_func=get_remote_address)

@router.post(
    "",
    response_model=EmpresaSimpleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear empresa",
)
@limiter.limit("10/minute")
def crear_empresa(
    request: Request,
    payload: RegistroOrganizacionCompleta,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CREAR+"-"+TipoPermisoEnum.EMPRESAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **POST /api/empresas**

    Crea una nueva empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de crear de empresa desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    licencia = db.query(Licencias).filter(Licencias.codigo == payload.codigo_licencia.strip().upper()).first()
    if not licencia:
        print(f"El código de licencia ({payload.codigo_licencia}) introducido no existe.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de licencia introducido no existe."
        )

    if licencia.empresa_id is not None:
        print(f"Este código de licencia ({payload.codigo_licencia}) ya ha sido utilizado por otra empresa.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este código de licencia ya ha sido utilizado por otra empresa."
        )

    empresa_existente = db.query(Empresas).filter(Empresas.cif == payload.cif).first()
    if empresa_existente:
        print(f"Ya existe una empresa registrada con ese cif ({payload.cif}).")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una empresa registrada con ese cif."
        )

    try:
        nueva_empresa = Empresas(
            razon_social=payload.razon_social,
            cif=payload.cif,
            zona_horaria=payload.zona_horaria,
            configuracion=payload.configuracion,
            nombre_comercial=payload.nombre_comercial,
            codigo_cnae=payload.codigo_cnae,
            convenio_colectivo=payload.convenio_colectivo,
            direccion=payload.direccion
        )

        db.add(nueva_empresa)
        db.commit()
        db.refresh(nueva_empresa)

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=nueva_empresa.id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "empresas", "accion": "crear"},
            trabajador_id=None
        )

        return nueva_empresa
    except Exception as e:
        db.rollback()
        print(f"No se ha podido crear la empresa: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido crear la empresa."
        )

@router.post(
    "/registro-completo",
    response_model=RespuestaRegistroCompletoDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Registro de organización y usuario admin",
)
@limiter.limit("10/minute")
def registrar_organizacion_completa(
    request: Request,
    payload: RegistroOrganizacionCompleta,
    db: Session = Depends(get_db)
):
    """
    **POST /api/empresas/registro-completo**

    Crea una nueva empresa y su usuario administrador.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de registro de organización completa desde la IP ({cliente_ip}).")

    # Validaciones estructurales básicas
    licencia = (
        db.query(Licencias)
        .filter(Licencias.codigo == payload.codigo_licencia.strip().upper())
        .with_for_update()
        .first()
    )
    if not licencia:
        print(f"El código de licencia ({payload.codigo_licencia}) no existe.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El código de licencia introducido no existe.")
    if licencia.empresa_id is not None:
        print(f"Este código de licencia ({payload.codigo_licencia}) ya ha sido utilizado.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este código de licencia ya ha sido utilizado.")
    if licencia.estado not in (EstadoSuscripcionEnum.TRIALING, EstadoSuscripcionEnum.ACTIVA):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La licencia no está activa.")
    if licencia.fecha_expiracion < date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La licencia está vencida.")

    empresa_existente = db.query(Empresas).filter(Empresas.cif == payload.cif.strip().upper()).first()
    if empresa_existente:
        print(f"Ya existe una empresa registrada con ese cif ({payload.cif})")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una empresa registrada con este cif.")

    email_limpio = payload.email_admin.strip().lower()
    usuario_existente = db.query(Usuarios).filter(Usuarios.email == email_limpio).first()
    if usuario_existente and getattr(usuario_existente, "activo", True):
        print(f"Ya existe un usuario activo registrado con ese correo electrónico ({email_limpio}).")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario activo registrado con este correo electrónico."
        )

    try:
        # Crear la Empresa (Soportando tipo Gestoría o Empresa normal)
        nueva_empresa = Empresas(
            razon_social=payload.razon_social,
            nombre_comercial=payload.nombre_comercial,
            cif=payload.cif.strip().upper(),
            direccion=str(payload.direccion).strip(),
            codigo_cnae=payload.codigo_cnae if payload.codigo_cnae else None,
            convenio_colectivo=payload.convenio_colectivo if payload.convenio_colectivo else None,
            logo_url=payload.logo_url,
            zona_horaria=payload.zona_horaria or "Europe/Madrid",
            es_gestoria=payload.es_gestoria,
            configuracion={}
        )
        db.add(nueva_empresa)
        db.flush()

        empresa_creada = db.query(Empresas).filter(Empresas.cif == nueva_empresa.cif).first()
        if not empresa_creada:
            print(f"No se ha podido crear la empresa con ese cif ({nueva_empresa.cif}).")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se ha podido crear la empresa con ese cif.")

        # Marcar la licencia como usada y asignarla a la empresa
        setattr(licencia, "empresa_id", nueva_empresa.id)

        rol_para_admin = (
            db.query(Roles).filter(Roles.tipo == TipoRolEnum.ADMIN_GESTORIA).first() if payload.es_gestoria
            else db.query(Roles).filter(Roles.tipo == TipoRolEnum.ADMIN_EMPRESA).first()
        )

        if not rol_para_admin:
            print("No se ha encontrado un rol para el admin.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se ha encontrado un rol para el admin.")

        if usuario_existente:
            usuario_existente.nombre = f"{payload.nombre_admin.strip()}"
            usuario_existente.password_hash = get_password_hash(payload.password)
            usuario_existente.empresa_id = nueva_empresa.id
            usuario_existente.activo = True
            nuevo_usuario = usuario_existente

            nueva_relacion_usuario_empresa = UsuariosEmpresas(
                usuario_id = usuario_existente.id,
                empresa_id = empresa_creada.id,
                rol_id = rol_para_admin.id,
                activo = True
            )
        else:
            nuevo_usuario = Usuarios(
                nombre=f"{payload.nombre_admin.strip()}",
                email=email_limpio,
                password_hash=get_password_hash(payload.password),
                empresa_id=nueva_empresa.id,
                activo=True
            )
            db.add(nuevo_usuario)

            nueva_relacion_usuario_empresa = UsuariosEmpresas(
                usuario_id = nuevo_usuario.id,
                empresa_id = empresa_creada.id,
                rol_id = rol_para_admin.id,
                activo = True
            )

        db.commit()

        db.refresh(nueva_empresa)
        db.refresh(nueva_relacion_usuario_empresa)
        db.refresh(nuevo_usuario)

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=nuevo_usuario.id,
            empresa_id=nueva_empresa.id,
            accion=AccionAuditoriaEnum.CREACION,
            detalle={"recurso": "empresas", "accion": "registro_completo"},
            trabajador_id=None
        )

        return {
            "empresa": nueva_empresa,
            "usuario": nuevo_usuario,
            "usuarios-empresas": nueva_relacion_usuario_empresa
        }

    except Exception as e:
        db.rollback()
        print(f"No se ha podido realizar el registro completo de la organización: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se ha podido realizar el registro completo de la organización. Se ha revertido la operación."
        )

@router.put(
    "/{id_empresa}",
    response_model=EmpresaSimpleResponse,
    summary="Modificar empresa",
)
@limiter.limit("20/minute")
def modificar_empresa(
    request: Request,
    id_empresa: UUID,
    payload: EmpresaUpdate,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.EMPRESAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/empresas/{id_empresa}**

    Modifica los datos de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de la empresa ({id_empresa}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        print(f"Empresa ({id_empresa}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa no encontrada."
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
            usuario_id=usuario_actual.id,
            empresa_id=id_empresa,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "empresas", "accion": "modificar"},
            trabajador_id=None
        )

        return empresa
    except Exception as e:
        db.rollback()
        print(f"No se han podido modificar los datos de la empresa: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se han podido modificar los datos de la empresa."
        )

@router.put(
    "/{id_empresa}/logo",
    response_model=EmpresaSimpleResponse,
    summary="Modificar logo de empresa",
)
@limiter.limit("20/minute")
async def modificar_logo_empresa(
    request: Request,
    id_empresa: UUID,
    file: UploadFile = File(...),
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.MODIFICAR+"-"+TipoPermisoEnum.CALENDARIOS_LABORALES])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **PUT /api/empresas/{id_empresa}/logo**

    Modifica el logotipo oficial de una empresa.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de modificación de logo para la empresa ({id_empresa}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        print(f"Empresa ({id_empresa}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa no encontrada."
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
    ruta_destino = os.path.join(CARPETA_LOGOS_EMPRESAS, nombre_archivo)

    with open(ruta_destino, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    ruta_relativa = f"/api/archivos/logos_empresas/{nombre_archivo}"

    empresa.logo_url = ruta_relativa
    empresa.updated_at = datetime.now()

    try:
        db.commit()
        db.refresh(empresa)

        registrar_auditoria(
            db=db,
            request=request,
            usuario_id=usuario_actual.id,
            empresa_id=id_empresa,
            accion=AccionAuditoriaEnum.MODIFICACION,
            detalle={"recurso": "empresas", "accion": "modificar_logo"},
            trabajador_id=None
        )

        return empresa
    except Exception as e:
        db.rollback()
        print(f"No se ha podido modificar el logo de la empresa: {str(e)}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se ha podido modificar el logo de la empresa."
        )

@router.get(
    "",
    response_model=List[EmpresaSimpleResponse],
    summary="Obtener empresas disponibles para el usuario actual",
)
@limiter.limit("60/minute")
def obtener_empresas_disponibles(
    request: Request,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.EMPRESAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/empresas**

    Obtiene las empresas disponibles para el usuario actual.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de las empresas disponibles para el usuario actual desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    membresias = (
        db.query(UsuariosEmpresas)
        .join(Roles, UsuariosEmpresas.rol_id == Roles.id)
        .filter(
            UsuariosEmpresas.usuario_id == usuario_actual.id,
            UsuariosEmpresas.activo.is_(True),
            Roles.activo.is_(True),
        )
        .all()
    )

    es_superadmin = any(
        m.rol.tipo == TipoRolEnum.SUPERADMINISTRADOR
        and m.empresa_id is None
        for m in membresias
    )

    if es_superadmin:
        empresas = (
            db.query(Empresas)
            .filter(Empresas.activa.is_(True))
            .order_by(Empresas.nombre_comercial.asc())
            .all()
        )
    else:
        empresa_ids = {
            m.empresa_id
            for m in membresias
            if m.empresa_id is not None
            and m.rol.tipo != TipoRolEnum.AUDITOR_ITSS
        }

        gestorias_ids = {
            m.empresa_id
            for m in membresias
            if m.empresa_id is not None
            and m.rol.tipo == TipoRolEnum.ADMIN_GESTORIA
        }

        if gestorias_ids:
            clientes_ids = (
                db.query(GestoriasEmpresas.empresa_cliente_id)
                .filter(
                    GestoriasEmpresas.empresa_gestora_id.in_(gestorias_ids),
                    GestoriasEmpresas.activo.is_(True),
                    or_(
                        GestoriasEmpresas.fecha_fin.is_(None),
                        GestoriasEmpresas.fecha_fin >= datetime.now().date(),
                    ),
                )
                .all()
            )
            empresa_ids.update(cliente_id for (cliente_id,) in clientes_ids)

        empresa_ids.update(
            m.empresa_id
            for m in membresias
            if m.empresa_id is not None
            and m.rol.tipo == TipoRolEnum.AUDITOR_ITSS
        )

        if not empresa_ids:
            return []

        empresas = (
            db.query(Empresas)
            .filter(
                Empresas.id.in_(empresa_ids),
                Empresas.activa.is_(True),
            )
            .order_by(Empresas.nombre_comercial.asc())
            .all()
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=usuario_actual.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "empresas", "accion": "consultar_disponibles"},
        trabajador_id=None
    )

    return empresas


@router.get(
    "/actual",
    response_model=List[EmpresaSimpleResponse],
    summary="Obtener empresa actual para el usuario",
)
@limiter.limit("60/minute")
def obtener_empresa_actual(
    request: Request,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.EMPRESAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/empresas/actual**

    Obtiene la empresa actual del usuario, si aplica.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de la empresa actual del usuario desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa_id = request.headers.get("Empresa-ID")
    empresa = db.query(Empresas).filter(Empresas.id == empresa_id).first()

    if not empresa:
        print(f"Empresa ({empresa_id}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa no encontrada.",
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=usuario_actual.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "empresas", "accion": "consultar_actual"},
        trabajador_id=None
    )

    return empresa

@router.get(
    "/{id_empresa}",
    response_model=EmpresaSimpleResponse,
    summary="Obtener empresa por id",
)
@limiter.limit("60/minute")
def obtener_empresa_id(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.EMPRESAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/empresas/{id_empresa}**

    Obtiene los detalles completos de una empresa a partir de su ID único universal.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de detalle de la empresa {id_empresa} desde la IP: {cliente_ip} por el usuario: {usuario_actual.email}")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        print(f"Empresa ({id_empresa}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa no encontrada."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "empresas", "accion": "consultar_id"},
        trabajador_id=None
    )

    return empresa


@router.get(
    "/cif/{cif_empresa}",
    response_model=EmpresaSimpleResponse,
    summary="Obtener empresa por cif",
)
@limiter.limit("60/minute")
def obtener_empresa_cif(
    request: Request,
    cif_empresa: str,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.EMPRESAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/empresas/cif/{cif_empresa}**

   Obtiene una empresa por su cif.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de empresa por cif ({cif_empresa}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.cif == cif_empresa).first()
    if not empresa:
        print(f"Empresa con ese cif ({cif_empresa}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ese cif no encontrada."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=empresa.id,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "empresas", "accion": "consultar_cif"},
        trabajador_id=None
    )

    return empresa


@router.get(
    "/{id_empresa}/trabajadores",
    response_model=List[TrabajadorResponse],
    summary="Obtener trabajadores de empresa",
)
@limiter.limit("60/minute")
def obtener_trabajadores_empresa(
    request: Request,
    id_empresa: UUID,
    usuario_actual: Usuarios = Depends(verificar_permisos_requeridos([AccionPermisoEnum.CONSULTAR+"-"+TipoPermisoEnum.EMPRESAS])),
    db: Session = Depends(get_db_with_advanced_security)
):
    """
    **GET /api/empresas/{id_empresa}/trabajadores**

    Obtiene los trabajadores vinculados a una empresa específica.
    """
    cliente_ip = request.client.host if request.client else "Desconocida"
    print(f"Petición de consulta de trabajadores para la empresa ({id_empresa}) desde la IP ({cliente_ip}) por: {usuario_actual.email}.")

    # Validaciones estructurales básicas
    empresa = db.query(Empresas).filter(Empresas.id == id_empresa).first()
    if not empresa:
        print(f"Empresa ({id_empresa}) no encontrada.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa no encontrada."
        )

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=id_empresa,
        accion=AccionAuditoriaEnum.CONSULTA,
        detalle={"recurso": "empresas", "accion": "consultar_trabajadores"},
        trabajador_id=None
    )

    return sorted(empresa.trabajadores, key=lambda t: t.nombre)
