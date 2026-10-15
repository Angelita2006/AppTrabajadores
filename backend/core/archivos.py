from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.config import obtener_directorio_archivos
from core.database import get_db
from core.auditoria import registrar_auditoria
from core.enums import AccionAuditoriaEnum, AccionPermisoEnum, AlcancePermisoEnum, TipoPermisoEnum, TipoRolEnum
from core.security import obtener_usuario_actual, verificar_permisos_requeridos
from models.ausencias import Ausencias
from models.contratos import Contratos
from models.correcciones_fichaje import CorreccionesFichaje
from models.empresas import Empresas
from models.fichajes import Fichajes
from models.roles import Roles
from models.trabajadores import Trabajadores
from models.usuarios import Usuarios
from models.usuarios_empresas import UsuariosEmpresas

router = APIRouter(prefix="/api/archivos", tags=["Archivos"])
BASE_STATIC_DIR = obtener_directorio_archivos()
CARPETA_FOTOS_TRABAJADORES = BASE_STATIC_DIR / "fotos_trabajadores"
CARPETA_FOTOS_USUARIOS = BASE_STATIC_DIR / "fotos_usuarios"
CARPETA_LOGOS_EMPRESAS = BASE_STATIC_DIR / "logos_empresas"
ARCHIVOS = {
    "fotos_trabajadores": (Trabajadores, Trabajadores.foto_url, Trabajadores.empresa_id, TipoPermisoEnum.TRABAJADORES),
    "logos_empresas": (Empresas, Empresas.logo_url, Empresas.id, TipoPermisoEnum.EMPRESAS),
    "firmas_fichajes": (Fichajes, Fichajes.firma_digital, Fichajes.empresa_id, TipoPermisoEnum.FICHAJES),
    "firmas_solicitudes_correcciones_fichajes": (CorreccionesFichaje, CorreccionesFichaje.firma_solicitante, CorreccionesFichaje.empresa_id, TipoPermisoEnum.CORRECCIONES_FICHAJE),
    "firmas_resoluciones_correcciones_fichajes": (CorreccionesFichaje, CorreccionesFichaje.firma_resolutor, CorreccionesFichaje.empresa_id, TipoPermisoEnum.CORRECCIONES_FICHAJE),
    "justificantes_ausencias": (Ausencias, Ausencias.justificante_url, Ausencias.empresa_id, TipoPermisoEnum.AUSENCIAS),
    "contratos": (Contratos, Contratos.pdf_url, Contratos.empresa_id, TipoPermisoEnum.CONTRATOS),
}


@router.get("/fotos_usuarios/{nombre_archivo}")
def obtener_avatar_usuario(
    request: Request,
    nombre_archivo: str,
    usuario_actual: Usuarios = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """Entrega exclusivamente el avatar que está asociado a la cuenta autenticada."""
    if Path(nombre_archivo).name != nombre_archivo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado.")

    ruta_relativa = f"/api/archivos/fotos_usuarios/{nombre_archivo}"
    usuario = (
        db.query(Usuarios)
        .filter(
            Usuarios.id == usuario_actual.id,
            func.split_part(Usuarios.foto_url, "?", 1) == ruta_relativa,
        )
        .first()
    )
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado.")

    ruta_base = CARPETA_FOTOS_USUARIOS.resolve()
    ruta_archivo = (ruta_base / nombre_archivo).resolve()
    if ruta_base not in ruta_archivo.parents or not ruta_archivo.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado.")

    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=None,
        accion=AccionAuditoriaEnum.DESCARGA,
        detalle={"recurso": "fotos_usuarios", "accion": "descargar_avatar_propio"},
        trabajador_id=None,
    )
    db.commit()
    return FileResponse(str(ruta_archivo))


@router.get("/{subcarpeta}/{nombre_archivo}")
def obtener_archivo_protegido(
    request: Request,
    subcarpeta: str,
    nombre_archivo: str,
    usuario_actual: Usuarios = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """Entrega el archivo si sigue referenciado y el usuario tiene permiso sobre su empresa."""
    if subcarpeta not in ARCHIVOS or Path(nombre_archivo).name != nombre_archivo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado.")

    modelo, columna_archivo, columna_empresa, tipo_permiso = ARCHIVOS[subcarpeta]
    ruta_relativa = f"/api/archivos/{subcarpeta}/{nombre_archivo}"
    columnas = [columna_empresa]
    columna_trabajador = Trabajadores.id if modelo is Trabajadores else getattr(modelo, "trabajador_id", None)
    if columna_trabajador is not None:
        columnas.append(columna_trabajador)
    registro = (
        db.query(*columnas)
        .filter(func.split_part(columna_archivo, "?", 1) == ruta_relativa)
        .first()
    )
    if not registro or registro[0] is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado.")
    empresa_id = registro[0]

    superadmin = (
        db.query(UsuariosEmpresas.id)
        .join(Roles, UsuariosEmpresas.rol_id == Roles.id)
        .filter(
            UsuariosEmpresas.usuario_id == usuario_actual.id,
            UsuariosEmpresas.empresa_id.is_(None),
            UsuariosEmpresas.activo.is_(True),
            Roles.tipo == TipoRolEnum.SUPERADMINISTRADOR,
        )
        .first()
        is not None
    )
    if not superadmin:
        if request.headers.get("Empresa-ID") != str(empresa_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado.")
        permiso = f"{AccionPermisoEnum.CONSULTAR.value}-{tipo_permiso.value}"
        verificar_permisos_requeridos([permiso])(request, usuario_actual, db)
        if getattr(request.state, "alcance_efectivo", None) == AlcancePermisoEnum.PROPIO.value:
            if columna_trabajador is None or len(registro) < 2:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado.")
            usuario_propietario = (
                db.query(Trabajadores.usuario_id)
                .filter(Trabajadores.id == registro[1], Trabajadores.empresa_id == empresa_id)
                .scalar()
            )
            if usuario_propietario != usuario_actual.id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado.")

    base = (BASE_STATIC_DIR / subcarpeta).resolve()
    ruta_archivo = (base / nombre_archivo).resolve()
    if base not in ruta_archivo.parents or not ruta_archivo.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado.")
    trabajador_id = registro[1] if columna_trabajador is not None and len(registro) > 1 else None
    registrar_auditoria(
        db=db,
        request=request,
        usuario_id=usuario_actual.id,
        empresa_id=empresa_id,
        accion=AccionAuditoriaEnum.DESCARGA,
        detalle={"recurso": subcarpeta, "accion": "descargar"},
        trabajador_id=trabajador_id,
    )
    db.commit()
    return FileResponse(str(ruta_archivo))
