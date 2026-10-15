from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID
from models.roles import Roles
from models.permisos import Permisos
from models.roles_permisos import RolesPermisos
from models.politicas_retencion import PoliticasRetencion
from core.enums import (
    ACCIONES_PERMISOS_ACTIVAS,
    AccionPermisoEnum,
    AccionRetencionEnum,
    AlcancePermisoEnum,
    TipoPermisoEnum,
    TipoRolEnum,
)

ROLES_SISTEMA_INICIALES = [
    {
        "id": "6d1d163e-55a4-7860-8824-cf023a047834",
        "nombre": "Superadministrador",
        "tipo": TipoRolEnum.SUPERADMINISTRADOR,
        "descripcion": "Control total global de la plataforma SaaS, gestión de pasarela de pagos y administración maestra."
    },
    {
        "id": "5aca163e-53f3-4210-9924-cff25ab38444",
        "nombre": "Trabajador",
        "tipo": TipoRolEnum.TRABAJADOR,
        "descripcion": "Realización de fichajes y consulta de cuadrante personal."
    },
    {
        "id": "66cba6e5-bd7a-4bfc-8f32-d1643bb75c92",
        "nombre": "Rrhh",
        "tipo": TipoRolEnum.RRHH,
        "descripcion": "Gestión de turnos, calendarios, incidencias y personal."
    },
    {
        "id": "6ce13799-4042-40a4-9165-ece37dcc75f6",
        "nombre": "Auditor_itss",
        "tipo": TipoRolEnum.AUDITOR_ITSS,
        "descripcion": "Acceso de inspección de trabajo a registros de jornada."
    },
    {
        "id": "92c1919b-742a-492a-8421-97cea9d8b2bd",
        "nombre": "Representante_legal",
        "tipo": TipoRolEnum.REPRESENTANTE_LEGAL,
        "descripcion": "Acceso a informes de cumplimiento y auditoría legal."
    },
    {
        "id": "b470ce6f-6a3a-4c73-a0c2-4bd2db48218f",
        "nombre": "Admin_empresa",
        "tipo": TipoRolEnum.ADMIN_EMPRESA,
        "descripcion": "Gestión total de los parámetros y centros de la empresa."
    },
    {
        "id": "f8e554c6-cb9a-45dd-8c49-f4b6a38cfac8",
        "nombre": "Admin_gestoría",
        "tipo": TipoRolEnum.ADMIN_GESTORIA,
        "descripcion": "Control global multiempresa y supervisión de asesoría."
    }
]

def inicializar_roles_sistema(db: Session):
    """
    Verifica si existen los roles del sistema base y los inserta si falta alguno,
    respetando los UUIDs predefinidos.
    """
    # La política RLS de roles globales solo permite su gestión desde el proceso
    # de inicialización del sistema o desde un superadministrador autorizado.
    db.execute(
        text(
            "SELECT set_config('app.is_superadmin', 'true', true), "
            "set_config('app.current_empresa_id', '00000000-0000-0000-0000-000000000000', true), "
            "set_config('app.allowed_empresa_ids', 'ARRAY[]', true)"
        )
    )

    for rol_data in ROLES_SISTEMA_INICIALES:
        id_rol = UUID(rol_data["id"])
        rol_existente = db.query(Roles).filter(Roles.id == id_rol).first()
        if rol_existente is None:
            rol_existente = (
                db.query(Roles)
                .filter(
                    Roles.empresa_id.is_(None),
                    Roles.nombre == rol_data["nombre"],
                )
                .first()
            )
        if not rol_existente:
            nuevo_rol = Roles(
                id=id_rol,
                empresa_id=None,
                nombre=rol_data["nombre"],
                tipo=rol_data["tipo"],
                descripcion=rol_data["descripcion"]
            )
            db.add(nuevo_rol)
        else:
            setattr(rol_existente, "tipo", rol_data["tipo"])
            setattr(rol_existente, "nombre", rol_data["nombre"])
            setattr(rol_existente, "descripcion", rol_data["descripcion"])
    db.commit()

def inicializar_permisos_sistema(db: Session) -> None:
    """
    Inicializa los permisos globales del sistema para todas las parejas de recurso y acción,
    asegurando que tengan empresa_id = NULL.
    Excluye combinaciones que atenten contra la lógica de negocio legal o de inmutabilidad.
    """
    permisos_existentes = set(
        db.query(Permisos.tipo, Permisos.accion, Permisos.alcance).all()
    )
    
    for tipo in TipoPermisoEnum:
        for accion in ACCIONES_PERMISOS_ACTIVAS:
            # REGLAS DE NEGOCIO LEGALES Y DE SEGURIDAD (Filtros de exclusión):
            
            # 1. Los fichajes son estrictamente inmutables (append-only). Nadie puede "modificar" ni "eliminar" un fichaje directamente.
            if tipo == TipoPermisoEnum.FICHAJES and accion in (AccionPermisoEnum.MODIFICAR, AccionPermisoEnum.ELIMINAR):
                continue
                
            # 2. Las auditorías de accesos son de solo lectura y registro automático del sistema
            if tipo == TipoPermisoEnum.AUDITORIA_ACCESOS and accion not in (AccionPermisoEnum.CONSULTAR, AccionPermisoEnum.EXPORTAR):
                continue

            for alcance in AlcancePermisoEnum:
                if (tipo, accion, alcance) in permisos_existentes:
                    continue

                descripcion = (
                    f"Permite {accion.value} sobre {tipo.value.replace('_', ' ')} "
                    f"en el ámbito {alcance.value}."
                )
                db.add(Permisos(
                    tipo=tipo,
                    accion=accion,
                    alcance=alcance,
                    descripcion=descripcion,
                ))

    db.commit()

def inicializar_relaciones_roles_permisos(db: Session) -> None:
    """
    Asigna las matrices de permisos por defecto a cada rol del sistema
    respetando los principios de privilegio (Least Privilege) y normativa laboral.
    """
    # Mapeo de IDs de roles definidos arriba
    ids_roles = {
        rol_data["tipo"]: db.query(Roles.id)
        .filter(
            Roles.empresa_id.is_(None),
            Roles.nombre == rol_data["nombre"],
        )
        .scalar()
        for rol_data in ROLES_SISTEMA_INICIALES
    }
    id_superadmin = ids_roles[TipoRolEnum.SUPERADMINISTRADOR]
    id_trabajador = ids_roles[TipoRolEnum.TRABAJADOR]
    id_rrhh = ids_roles[TipoRolEnum.RRHH]
    id_auditor = ids_roles[TipoRolEnum.AUDITOR_ITSS]
    id_rep_legal = ids_roles[TipoRolEnum.REPRESENTANTE_LEGAL]
    id_admin_empresa = ids_roles[TipoRolEnum.ADMIN_EMPRESA]
    id_admin_gestoria = ids_roles[TipoRolEnum.ADMIN_GESTORIA]

    permisos = {
        (permiso.accion, permiso.tipo, permiso.alcance): permiso
        for permiso in db.query(Permisos).all()
    }
    own_types = {
        TipoPermisoEnum.USUARIOS,
        TipoPermisoEnum.USUARIOS_EMPRESAS,
        TipoPermisoEnum.TRABAJADORES,
        TipoPermisoEnum.FICHAJES,
        TipoPermisoEnum.CORRECCIONES_FICHAJE,
        TipoPermisoEnum.AUSENCIAS,
        TipoPermisoEnum.RESUMENES_JORNADA,
        TipoPermisoEnum.ASIGNACIONES_TURNO,
        TipoPermisoEnum.TURNOS,
        TipoPermisoEnum.CONTRATOS,
        TipoPermisoEnum.CONTRATOS_CALENDARIOS,
        TipoPermisoEnum.CALENDARIOS_LABORALES,
    }
    company_catalogs = {
        TipoPermisoEnum.DEPARTAMENTOS,
        TipoPermisoEnum.DISPOSITIVOS_FICHAJE,
        TipoPermisoEnum.EMPRESAS,
        TipoPermisoEnum.FESTIVOS,
        TipoPermisoEnum.CALENDARIOS_LABORALES,
        TipoPermisoEnum.MOTIVOS_PAUSA,
        TipoPermisoEnum.POLITICAS_RETENCION,
        TipoPermisoEnum.TURNOS,
    }

    matriz: dict[str, set[tuple[AccionPermisoEnum, TipoPermisoEnum, AlcancePermisoEnum]]] = {
        id_superadmin: set(permisos.keys()),
        id_trabajador: set(),
        id_rrhh: set(),
        id_auditor: set(),
        id_rep_legal: set(),
        id_admin_empresa: set(),
        id_admin_gestoria: set(),
    }

    for tipo in own_types:
        acciones = {
            AccionPermisoEnum.CONSULTAR,
            AccionPermisoEnum.CREAR,
            AccionPermisoEnum.MODIFICAR,
        }
        if tipo in {TipoPermisoEnum.FICHAJES, TipoPermisoEnum.CONTRATOS_CALENDARIOS,
                    TipoPermisoEnum.ASIGNACIONES_TURNO, TipoPermisoEnum.TURNOS,
                    TipoPermisoEnum.CALENDARIOS_LABORALES, TipoPermisoEnum.USUARIOS_EMPRESAS}:
            acciones = {AccionPermisoEnum.CONSULTAR}
        if tipo == TipoPermisoEnum.USUARIOS:
            acciones = {AccionPermisoEnum.CONSULTAR, AccionPermisoEnum.MODIFICAR}
        matriz[id_trabajador].update(
            (accion, tipo, AlcancePermisoEnum.PROPIO) for accion in acciones
        )
    matriz[id_trabajador].update(
        (AccionPermisoEnum.CONSULTAR, tipo, AlcancePermisoEnum.EMPRESA)
        for tipo in company_catalogs
    )
    matriz[id_trabajador].update({
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.PERMISOS, AlcancePermisoEnum.EMPRESA),
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.ROLES, AlcancePermisoEnum.EMPRESA),
    })

    operaciones_rrhh = {
        TipoPermisoEnum.ASIGNACIONES_TURNO, TipoPermisoEnum.AUSENCIAS,
        TipoPermisoEnum.CALENDARIOS_LABORALES, TipoPermisoEnum.CENTROS_TRABAJO,
        TipoPermisoEnum.CONTRATOS, TipoPermisoEnum.CONTRATOS_CALENDARIOS,
        TipoPermisoEnum.CORRECCIONES_FICHAJE, TipoPermisoEnum.DEPARTAMENTOS,
        TipoPermisoEnum.DISPOSITIVOS_FICHAJE, TipoPermisoEnum.FESTIVOS,
        TipoPermisoEnum.FICHAJES, TipoPermisoEnum.MOTIVOS_PAUSA,
        TipoPermisoEnum.RESUMENES_JORNADA, TipoPermisoEnum.TRABAJADORES,
        TipoPermisoEnum.TURNOS,
    }
    matriz[id_rrhh].update(matriz[id_trabajador])
    for tipo in operaciones_rrhh:
        matriz[id_rrhh].update(
            (accion, tipo, AlcancePermisoEnum.EMPRESA)
            for accion in ACCIONES_PERMISOS_ACTIVAS
        )
    matriz[id_rrhh].update({
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.USUARIOS, AlcancePermisoEnum.EMPRESA),
        (AccionPermisoEnum.CREAR, TipoPermisoEnum.USUARIOS, AlcancePermisoEnum.EMPRESA),
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.USUARIOS_EMPRESAS, AlcancePermisoEnum.EMPRESA),
        (AccionPermisoEnum.CREAR, TipoPermisoEnum.USUARIOS_EMPRESAS, AlcancePermisoEnum.EMPRESA),
    })

    # Administradores de empresa y gestoría gestionan su propio tenant.
    empresa_admin_types = set(TipoPermisoEnum) - {
        TipoPermisoEnum.LICENCIAS,
        TipoPermisoEnum.PERMISOS,
    }
    for rol_id in (id_admin_empresa, id_admin_gestoria):
        matriz[rol_id].update(
            (accion, tipo, AlcancePermisoEnum.EMPRESA)
            for tipo in empresa_admin_types
            for accion in ACCIONES_PERMISOS_ACTIVAS
        )
        matriz[rol_id].update(matriz[id_trabajador])
    # Los responsables consultan su suscripción, pero no emiten ni revocan licencias.
    for rol_id in (id_admin_empresa, id_admin_gestoria):
        matriz[rol_id].add(
            (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.LICENCIAS, AlcancePermisoEnum.EMPRESA)
        )

    recursos_auditables = set(TipoPermisoEnum) - {
        TipoPermisoEnum.USUARIOS,
        TipoPermisoEnum.USUARIOS_EMPRESAS,
        TipoPermisoEnum.ROLES,
        TipoPermisoEnum.ROLES_PERMISOS,
        TipoPermisoEnum.PERMISOS,
    }
    for tipo in recursos_auditables:
        matriz[id_auditor].add((AccionPermisoEnum.CONSULTAR, tipo, AlcancePermisoEnum.EMPRESA))
        matriz[id_auditor].add((AccionPermisoEnum.EXPORTAR, tipo, AlcancePermisoEnum.EMPRESA))
        matriz[id_rep_legal].add((AccionPermisoEnum.CONSULTAR, tipo, AlcancePermisoEnum.EMPRESA))

    # Sincroniza únicamente roles del sistema: cambios de la matriz también revocan grants obsoletos.
    for rol_id, permisos_objetivo in matriz.items():
        db.query(RolesPermisos).filter(RolesPermisos.rol_id == rol_id).delete(
            synchronize_session=False
        )
        for clave in permisos_objetivo:
            permiso = permisos.get(clave)
            if permiso:
                db.add(RolesPermisos(rol_id=rol_id, permiso_id=permiso.id))

    db.commit()

def inicializar_politica_retencion_global(db: Session) -> None:
    """Crea la política global legal mínima si no existe todavía."""
    db.execute(
        text(
            "SELECT set_config('app.is_superadmin', 'true', true), "
            "set_config('app.current_empresa_id', '00000000-0000-0000-0000-000000000000', true), "
            "set_config('app.allowed_empresa_ids', 'ARRAY[]', true)"
        )
    )
    politica = db.query(PoliticasRetencion).filter(
        PoliticasRetencion.empresa_id.is_(None)
    ).first()
    if politica is None:
        db.add(PoliticasRetencion(
            empresa_id=None,
            anios_conservacion=4,
            accion_tras_periodo=AccionRetencionEnum.ARCHIVAR,
        ))
    db.commit()
