
import enum

class AccionAuditoriaEnum(str, enum.Enum):
    CONSULTA = 'consulta'
    EXPORTACION = 'exportacion'
    DESCARGA = 'descarga'
    MODIFICACION = 'modificacion'
    ACCESO_DENEGADO = 'acceso_denegado'

class AccionRetencionEnum(str, enum.Enum):
    ARCHIVAR = 'archivar'
    ANONIMIZAR = 'anonimizar'
    ELIMINAR = 'eliminar'

class EstadoCorreccionEnum(str, enum.Enum):
    PENDIENTE = 'pendiente'
    APROBADA = 'aprobada'
    RECHAZADA = 'rechazada'

class EstadoFichajeEnum(str, enum.Enum):
    VALIDO = 'valido'
    PENDIENTE_REVISION = 'pendiente_revision'

class MetodoFichajeEnum(str, enum.Enum):
    APP_MOVIL = 'app_movil'
    TERMINAL_RFID = 'terminal_rfid'
    TERMINAL_PIN = 'terminal_pin'
    LECTOR_QR = 'lector_qr'
    WEB = 'web'
    GEOLOCALIZACION = 'geolocalizacion'
    MANUAL = 'manual'

class OrigenFichajeEnum(str, enum.Enum):
    TRABAJADOR = 'trabajador'
    CORRECCION_RRHH = 'correccion_rrhh'
    SISTEMA = 'sistema'

class TipoContratoEnum(str, enum.Enum):
    INDEFINIDO = 'indefinido'
    TEMPORAL = 'temporal'
    FORMACION = 'formacion'
    PRACTICAS = 'practicas'
    FIJO_DISCONTINUO = 'fijo_discontinuo'
    OTRO = 'otro'

class TipoCorreccionEnum(str, enum.Enum):
    ALTA_MANUAL = 'alta_manual'
    MODIFICACION = 'modificacion'
    ANULACION = 'anulacion'

class TipoJornadaEnum(str, enum.Enum):
    COMPLETA = 'completa'
    PARCIAL = 'parcial'

class TipoUsuarioEnum(str, enum.Enum):
    ADMIN_GESTORIA = 'admin_gestoria'
    ADMIN_EMPRESA = 'admin_empresa'
    RRHH = 'rrhh'
    REPRESENTANTE_LEGAL = 'representante_legal'
    TRABAJADOR = 'trabajador'
    AUDITOR_ITSS = 'auditor_itss'