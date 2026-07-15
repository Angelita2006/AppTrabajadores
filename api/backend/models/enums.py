import enum

class AccionAuditoriaEnum(str, enum.Enum):
    CONSULTA = 'Consulta'
    EXPORTACION = 'Exportación'
    DESCARGA = 'Descarga'
    MODIFICACION = 'Modificación'
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

class TipoUsuarioEnum(str, enum.Enum):
    ADMIN_GESTORIA = 'Admin_gestoría'
    ADMIN_EMPRESA = 'Admin_empresa'
    RRHH = 'Rrhh'
    REPRESENTANTE_LEGAL = 'Representante_legal'
    TRABAJADOR = 'Trabajador'
    AUDITOR_ITSS = 'Auditor_itss'

class TipoAusenciaEnum(str, enum.Enum):
    VACACIONES = "Vacaciones"
    BAJA_TEMPORAL = "Baja_temporal"
    MATERNIDAD_PATERNIDAD = "Maternidad_paternidad"
    PERMISO_RETRIBUIDO = "Permiso_retribuido"
    AUSENCIA_INJUSTIFICADA = "Ausencia_injustificada"

class EstadoAusenciaEnum(str, enum.Enum):
    PENDIENTE = "Pendiente"
    APROBADA = "Aprobada"
    RECHAZADA = "Rechazada"