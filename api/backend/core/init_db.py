from sqlalchemy.orm import Session
from models.roles import Roles
from models.permisos import Permisos
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
    """
    # Obtenemos los permisos existentes que sean del sistema global (empresa_id IS NULL)
    permisos_existentes = set(db.query(Permisos.tipo, Permisos.accion).all())
    for tipo in TipoPermisoEnum:
        for accion in AccionPermisoEnum:
            if (tipo, accion) in permisos_existentes:
                continue
            descripcion = f"Permite {accion.value} sobre {tipo.value.replace('_', ' ')}."
            db.add(Permisos(
                tipo=tipo,
                accion=accion,
                descripcion=descripcion
            ))

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
