import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import { Empresa } from "../../empresas/types/empresa";

/**
 * Listado estático de los diferentes tipos de dispositivos o canales
 * autorizados para el registro de fichajes y actividad laboral,
 * sincronizados exactamente con el esquema del backend.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const TIPOS_DISPOSITIVO = {
  /** Aplicación móvil corporativa para empleados (iOS / Android). */
  APP_MOVIL: "App_móvil",
  /** Terminal físico de fichaje mediante tarjetas de proximidad RFID. */
  TERMINAL_RFID: "Terminal_rfid",
  /** Terminal físico de fichaje basado en introducción de PIN numérico. */
  TERMINAL_PIN: "Terminal_pin",
  /** Dispositivo o sistema basado en lectura de códigos QR. */
  LECTOR_QR: "Lector_qr",
  /** Portal web corporativo de acceso para empleados o gestores. */
  WEB: "Web",
  /** Sistema de control horario automatizado por geolocalización o GPS. */
  GEOLOCALIZACION: "Geolocalización",
  /** Registro o modificación manual realizada por un administrador. */
  MANUAL: "Manual",
} as const;

/**
 * Tipo de unión que representa los diferentes tipos de dispositivos o canales permitidos.
 */
export type TipoDispositivo =
  (typeof TIPOS_DISPOSITIVO)[keyof typeof TIPOS_DISPOSITIVO];

/**
 * Listado estático estructurado para alimentar componentes de selección (Selects, Dropdowns, Pickers)
 * en las interfaces de usuario, asociando una etiqueta visual amigable con su respectivo valor técnico.
 */
export const TIPOS_DISPOSITIVOS_OPTIONS = [
  { label: "App Móvil", value: TIPOS_DISPOSITIVO.APP_MOVIL },
  { label: "Terminal RFID", value: TIPOS_DISPOSITIVO.TERMINAL_RFID },
  { label: "Terminal PIN", value: TIPOS_DISPOSITIVO.TERMINAL_PIN },
  { label: "Lector QR", value: TIPOS_DISPOSITIVO.LECTOR_QR },
  { label: "Web", value: TIPOS_DISPOSITIVO.WEB },
  { label: "Geolocalización", value: TIPOS_DISPOSITIVO.GEOLOCALIZACION },
  { label: "Manual", value: TIPOS_DISPOSITIVO.MANUAL },
] as const;

/**
 * Estructura de datos requerida para el registro o alta de un nuevo dispositivo en el sistema.
 * Sincronizado con 'DispositivoCreate' de Pydantic.
 */
export interface DispositivoCreate {
  /** Identificador de la empresa u organización propietaria del dispositivo (UUID). */
  empresa_id: string;
  /** Tipo o tecnología asociada al dispositivo a registrar. */
  tipo_dispositivo: TipoDispositivo;
  /** Identificador del centro de trabajo de destino (UUID). */
  centro_trabajo_id: string;
  /** Estado inicial de actividad del dispositivo (por defecto suele ser true). */
  activo?: boolean;
}

/**
 * Estructura de datos para la actualización de los parámetros configurables de un dispositivo existente.
 * Sincronizado con 'DispositivoUpdate' de Pydantic (campos opcionales).
 */
export interface DispositivoUpdate {
  /** Nuevo tipo o tecnología asignada al dispositivo. */
  tipo_dispositivo?: TipoDispositivo;
  /** Nuevo centro de trabajo al que se vincula el dispositivo (UUID). */
  centro_trabajo_id?: string;
  /** Estado actualizado de operatividad del dispositivo. */
  activo?: boolean;
}

/**
 * Estructura base y simple utilizada para estructurar las respuestas JSON que el servidor envía.
 * Sincronizado con 'DispositivoSimpleResponse' de Pydantic.
 */
export interface DispositivoSimpleResponse {
  /** Identificador único universal (UUID) del dispositivo. */
  id: string;
  /** Identificador de la empresa u organización a la que pertenece el dispositivo. */
  empresa_id: string;
  /** Tipo o tecnología asociada al dispositivo de fichaje. */
  tipo_dispositivo: TipoDispositivo;
  /** Identificador del centro de trabajo al cual está asignado físicamente el dispositivo. */
  centro_trabajo_id: string;
  /** Indica si el dispositivo se encuentra activo y habilitado para registrar operaciones. */
  activo: boolean;
  /** Marca de tiempo (ISO 8601) de cuándo fue registrado el dispositivo en el sistema. */
  creado_at: string;
}

/**
 * Representa la entidad completa de un dispositivo registrado en el sistema con todas sus relaciones anidadas.
 * Sincronizado con 'DispositivoResponse' de Pydantic.
 */
export interface Dispositivo extends DispositivoSimpleResponse {
  /** Relación opcional con la entidad empresa asociada cargada por el backend. */
  empresa?: Empresa | null;
  /** Relación opcional con la entidad centro de trabajo asociada cargada por el backend. */
  centro_trabajo?: CentroTrabajo | null;
}
