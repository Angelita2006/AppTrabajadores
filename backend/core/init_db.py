from sqlalchemy.orm import Session
from models.roles import Roles
from models.permisos import Permisos
from models.roles_permisos import RolesPermisos
from models.politicas_retencion import PoliticasRetencion
from core.enums import AccionPermisoEnum, AccionRetencionEnum, TipoPermisoEnum

ROLES_SISTEMA_INICIALES = [
    {
        "id": "6kdl163e-55m4-7860-8824-cfy23aj47834",
        "nombre": "Superadministrador",
        "descripcion": "Control total global de la plataforma SaaS, gestión de pasarela de pagos y administración maestra."
    },
    {
        "id": "5aca163e-53f3-4210-9924-cff25ab38444",
        "nombre": "Trabajador",
        "descripcion": "Realización de fichajes y consulta de cuadrante personal."
    },
    {
        "id": "66cba6e5-bd7a-4bfc-8f32-d1643bb75c92",
        "nombre": "Rrhh",
        "descripcion": "Gestión de turnos, calendarios, incidencias y personal."
    },
    {
        "id": "6ce13799-4042-40a4-9165-ece37dcc75f6",
        "nombre": "Auditor_itss",
        "descripcion": "Acceso de inspección de trabajo a registros de jornada."
    },
    {
        "id": "92c1919b-742a-492a-8421-97cea9d8b2bd",
        "nombre": "Representante_legal",
        "descripcion": "Acceso a informes de cumplimiento y auditoría legal."
    },
    {
        "id": "b470ce6f-6a3a-4c73-a0c2-4bd2db48218f",
        "nombre": "Admin_empresa",
        "descripcion": "Gestión total de los parámetros y centros de la empresa."
    },
    {
        "id": "f8e554c6-cb9a-45dd-8c49-f4b6a38cfac8",
        "nombre": "Admin_gestoría",
        "descripcion": "Control global multiempresa y supervisión de asesoría."
    }
]

def inicializar_roles_sistema(db: Session):
    """
    Verifica si existen los roles del sistema base y los inserta si falta alguno,
    respetando los UUIDs predefinidos.
    """
    for rol_data in ROLES_SISTEMA_INICIALES:
        rol_existente = db.query(Roles).filter(Roles.id == rol_data["id"]).first()
        if not rol_existente:
            nuevo_rol = Roles(
                id=rol_data["id"],
                empresa_id=None,
                nombre=rol_data["nombre"],
                descripcion=rol_data["descripcion"]
            )
            db.add(nuevo_rol)
    db.commit()

def inicializar_permisos_sistema(db: Session) -> None:
    """
    Inicializa los permisos globales del sistema para todas las parejas de recurso y acción,
    asegurando que tengan empresa_id = NULL.
    Excluye combinaciones que atenten contra la lógica de negocio legal o de inmutabilidad.
    """
    permisos_existentes = set(db.query(Permisos.tipo, Permisos.accion).all())
    
    for tipo in TipoPermisoEnum:
        for accion in AccionPermisoEnum:
            # REGLAS DE NEGOCIO LEGALES Y DE SEGURIDAD (Filtros de exclusión):
            
            # 1. Los fichajes son estrictamente inmutables (append-only). Nadie puede "modificar" ni "eliminar" un fichaje directamente.
            if tipo == TipoPermisoEnum.FICHAJES and accion in (AccionPermisoEnum.MODIFICAR, AccionPermisoEnum.ELIMINAR):
                continue
                
            # 2. Las auditorías de accesos son de solo lectura y registro automático del sistema
            if tipo == TipoPermisoEnum.AUDITORIA_ACCESOS and accion not in (AccionPermisoEnum.CONSULTAR, AccionPermisoEnum.EXPORTAR):
                continue

            if (tipo, accion) in permisos_existentes:
                continue
                
            descripcion = f"Permite {accion.value} sobre {tipo.value.replace('_', ' ')}."
            db.add(Permisos(
                tipo=tipo,
                accion=accion,
                descripcion=descripcion
            ))

    db.commit()

def inicializar_relaciones_roles_permisos(db: Session) -> None:
    """
    Asigna las matrices de permisos por defecto a cada rol del sistema
    respetando los principios de privilegio (Least Privilege) y normativa laboral.
    """
    # Mapeo de IDs de roles definidos arriba
    id_superadmin = "6kdl163e-55m4-7860-8824-cfy23aj47834"
    id_trabajador = "5aca163e-53f3-4210-9924-cff25ab38444"
    id_rrhh = "66cba6e5-bd7a-4bfc-8f32-d1643bb75c92"
    id_auditor = "6ce13799-4042-40a4-9165-ece37dcc75f6"
    id_rep_legal = "92c1919b-742a-492a-8421-97cea9d8b2bd"
    id_admin_empresa = "b470ce6f-6a3a-4c73-a0c2-4bd2db48218f"
    id_admin_gestoria = "f8e554c6-cb9a-45dd-8c49-f4b6a38cfac8"

    # Obtener todos los permisos actuales de la BD
    todos_los_permisos = db.query(Permisos).all()

    for rol_id in [id_superadmin, id_admin_gestoria]:
        # Superadministrador y Admin de Gestoría tienen acceso a TODOS los permisos válidos creados
        for permiso in todos_los_permisos:
            existe = db.query(RolesPermisos).filter_by(rol_id=rol_id, permiso_id=permiso.id).first()
            if not existe:
                db.add(RolesPermisos(rol_id=rol_id, permiso_id=permiso.id))

    # Matriz específica para el TRABAJADOR (Solo fichar, consultar sus datos, solicitar correcciones/ausencias)
    permisos_trabajador = [
        (AccionPermisoEnum.FICHAR, TipoPermisoEnum.FICHAJES),
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.FICHAJES),
        (AccionPermisoEnum.CREAR, TipoPermisoEnum.CORRECCIONES_FICHAJE), # Solicitar corrección de fichaje
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.CORRECCIONES_FICHAJE),
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.TURNOS),
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.CALENDARIOS_LABORALES),
        (AccionPermisoEnum.CREAR, TipoPermisoEnum.AUSENCIAS), # Solicitar vacaciones/ausencia
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.AUSENCIAS),
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.CONTRATOS),
    ]
    for accion, tipo in permisos_trabajador:
        perm = db.query(Permisos).filter_by(accion=accion, tipo=tipo).first()
        if perm:
            existe = db.query(RolesPermisos).filter_by(rol_id=id_trabajador, permiso_id=perm.id).first()
            if not existe:
                db.add(RolesPermisos(rol_id=id_trabajador, permiso_id=perm.id))

    # Matriz para Auditor ITSS e Inspector (Solo lectura y exportación para cumplir con la obligación legal de mostrar registros)
    permisos_auditoria = [
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.FICHAJES),
        (AccionPermisoEnum.EXPORTAR, TipoPermisoEnum.FICHAJES),
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.TRABAJADORES),
        (AccionPermisoEnum.EXPORTAR, TipoPermisoEnum.TRABAJADORES),
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.CONTRATOS),
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.AUDITORIA_ACCESOS),
        (AccionPermisoEnum.EXPORTAR, TipoPermisoEnum.AUDITORIA_ACCESOS),
        (AccionPermisoEnum.CONSULTAR, TipoPermisoEnum.RESUMENES_JORNADA),
        (AccionPermisoEnum.EXPORTAR, TipoPermisoEnum.RESUMENES_JORNADA),
    ]
    for rol_id in [id_auditor, id_rep_legal]:
        for accion, tipo in permisos_auditoria:
            perm = db.query(Permisos).filter_by(accion=accion, tipo=tipo).first()
            if perm:
                existe = db.query(RolesPermisos).filter_by(rol_id=rol_id, permiso_id=perm.id).first()
                if not existe:
                    db.add(RolesPermisos(rol_id=rol_id, permiso_id=perm.id))

    # RRHH y Admin de Empresa (Gestión operativa completa de la empresa)
    # Tienen casi todo excepto superadministración de licencias globales de plataforma
    for rol_id in [id_rrhh, id_admin_empresa]:
        for permiso in todos_los_permisos:
            # Opcional: restringir que RRHH no gestione licencias de pago si se desea
            if permiso.tipo == TipoPermisoEnum.LICENCIAS and rol_id == id_rrhh:
                continue
            existe = db.query(RolesPermisos).filter_by(rol_id=rol_id, permiso_id=permiso.id).first()
            if not existe:
                db.add(RolesPermisos(rol_id=rol_id, permiso_id=permiso.id))

    db.commit()

def inicializar_politica_retencion_global(db: Session) -> None:
    """Crea la política global legal mínima si no existe todavía."""
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