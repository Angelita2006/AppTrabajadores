from sqlalchemy.orm import Session
from models.roles import Roles 

ROLES_SISTEMA_INICIALES = [
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
                nombre=rol_data["nombre"],
                descripcion=rol_data["descripcion"]
            )
            db.add(nuevo_rol)
    db.commit()
