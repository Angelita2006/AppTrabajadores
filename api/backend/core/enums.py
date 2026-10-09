import enum

class EstadoTrabajadorEnum(str, enum.Enum):
    INACTIVO = "Inactivo"
    ACTIVO = "Activo"
    TRABAJANDO = "Trabajando"
    DESCANSANDO = "Descansando"
    HORAS_EXTRA = "Haciendo_horas_extra"
    VACACIONES = "De_vacaciones"
    BAJA = "De_baja"
    AUSENTE = "Ausente"

class AccionAuditoriaEnum(str, enum.Enum):
    CONSULTA = 'Consulta'
    CREACION = 'Creación'
    MODIFICACION = 'Modificación'
    BAJA_LOGICA = 'Baja_lógica'
    ELIMINACION = 'Eliminación'
    EXPORTACION = 'Exportación'
    IMPORTACION = 'Importación'
    DESCARGA = 'Descarga'
    ACCESO_DENEGADO = 'Acceso_denegado'
    
class AccionRetencionEnum(str, enum.Enum):
    ARCHIVAR = 'Archivar'
    ANONIMIZAR = 'Anonimizar'
    ELIMINAR = 'Eliminar'

class EstadoCorreccionEnum(str, enum.Enum):
    PENDIENTE = 'Pendiente'
    APROBADA = 'Aprobada'
    RECHAZADA = 'Rechazada'

class EstadoFichajeEnum(str, enum.Enum):
    VALIDO = 'Válido'
    PENDIENTE_REVISION = 'Pendiente_revisión'

class MetodoFichajeEnum(str, enum.Enum):
    APP_MOVIL = 'App_móvil'
    TERMINAL_RFID = 'Terminal_rfid'
    TERMINAL_PIN = 'Terminal_pin'
    LECTOR_QR = 'Lector_qr'
    WEB = 'Web'
    GEOLOCALIZACION = 'Geolocalización'
    MANUAL = 'Manual'

class OrigenFichajeEnum(str, enum.Enum):
    TRABAJADOR = 'Trabajador'
    CORRECCION_RRHH = 'Corrección_rrhh'
    SISTEMA = 'Sistema'

class TipoEventoFichajeEnum(str, enum.Enum):
    ENTRADA = "Entrada"
    SALIDA = "Salida"
    INICIO_PAUSA = "Inicio_pausa"
    FIN_PAUSA = "Fin_pausa"

class TipoContratoEnum(str, enum.Enum):
    INDEFINIDO = 'Indefinido'
    TEMPORAL = 'Temporal'
    FORMACION = 'Formación'
    PRACTICAS = 'Prácticas'
    FIJO_DISCONTINUO = 'Fijo_discontinuo'
    OTRO = 'Otro'

class TipoCorreccionEnum(str, enum.Enum):
    ALTA_MANUAL = 'Alta_manual'
    MODIFICACION = 'Modificación'
    ANULACION = 'Anulación'

class TipoJornadaEnum(str, enum.Enum):
    COMPLETA = 'Completa'
    PARCIAL = 'Parcial'

class TipoAusenciaEnum(str, enum.Enum):
    VACACIONES = "Vacaciones"
    BAJA_TEMPORAL = "Baja_temporal"
    MATERNIDAD_PATERNIDAD = "Maternidad_paternidad"
    PERMISO_RETRIBUIDO = "Permiso_retribuido"
    ASUNTOS_PROPIOS = "Asuntos_propios"
    AUSENCIA_INJUSTIFICADA = "Ausencia_injustificada"

class TipoRolEnum(str, enum.Enum):
    SUPERADMINISTRADOR = 'Superadministrador'
    ADMIN_GESTORIA = 'Admin_gestoría'
    ADMIN_EMPRESA = 'Admin_empresa'
    RRHH = 'Rrhh'
    REPRESENTANTE_LEGAL = 'Representante_legal'
    TRABAJADOR = 'Trabajador'
    AUDITOR_ITSS = 'Auditor_itss'
    OTRO = 'Otro'

class EstadoAusenciaEnum(str, enum.Enum):
    PENDIENTE = "Pendiente"
    APROBADA = "Aprobada"
    RECHAZADA = "Rechazada"
    CANCELADA = "Cancelada"

class TipoFestivoEnum(str, enum.Enum):
    LOCAL = "Local"
    AUTONOMICO = "Autonómico"
    NACIONAL = "Nacional"

class PlanLicenciaEnum(str, enum.Enum):
    BASICO = "Básico"         # Funcionalidades legales mínimas (fichaje web/app, informes)
    PRO = "Pro"               # Vacaciones, ausencias, turnos rotativos, soporte prioritario
    ENTERPRISE = "Enterprise" # Integraciones de nóminas (A3, Holded, SAP), biometría, API abierta

class CicloFacturacionEnum(str, enum.Enum):
    TRIAL = "Trial"           # Periodo de prueba gratuito (14 días)
    MENSUAL = "Mensual"       # Facturación mes a mes
    ANUAL = "Anual"           # Facturación anual con 15-20% de descuento

class EstadoSuscripcionEnum(str, enum.Enum):
    TRIALING = "Trialing"     # En periodo de prueba activo
    ACTIVA = "Activa"         # Suscripción de pago al día
    VENCIDA = "Vencida"       # Periodo expirado sin renovar
    CANCELADA = "Cancelada"   # Cancelada por el usuario

class TipoPermisoEnum(str, enum.Enum):
    """Recurso o área funcional sobre la que se concede el permiso."""
    ASIGNACIONES_TURNO = "asignaciones_turno" 
    AUDITORIA_ACCESOS = "auditoria_accesos" 
    AUSENCIAS = "ausencias" 
    CALENDARIOS_LABORALES = "calendarios_laborales" 
    CENTROS_TRABAJO = "centros_trabajo" 
    CONTRATOS_CALENDARIOS = "contratos_calendarios" 
    CONTRATOS = "contratos" 
    CORRECCIONES_FICHAJE = "correcciones_fichaje" 
    DEPARTAMENTOS = "departamentos" 
    DISPOSITIVOS_FICHAJE = "dispositivos_fichaje"
    EMPRESAS = "empresas"
    FESTIVOS = "festivos"
    FICHAJES = "fichajes"
    GESTORIAS_EMPRESAS = "gestorias_empresas"
    LICENCIAS = "licencias"
    MOTIVOS_PAUSA = "motivos_pausa"
    PERMISOS = "permisos"
    POLITICAS_RETENCION = "politicas_retencion"
    RESUMENES_JORNADA = "resumenes_jornada"
    ROLES_PERMISOS = "roles_permisos"
    ROLES = "roles"
    TRABAJADORES = "trabajadores"
    TURNOS = "turnos"
    USUARIOS_EMPRESAS = "usuarios_empresas"
    USUARIOS = "usuarios"

class AccionPermisoEnum(str, enum.Enum):
    """Operación que se puede autorizar sobre un recurso."""
    CONSULTAR = "consultar"
    CREAR = "crear"
    MODIFICAR = "modificar"
    ELIMINAR = "eliminar"
    APROBAR = "aprobar"
    EXPORTAR = "exportar"
    FICHAR = "fichar"
