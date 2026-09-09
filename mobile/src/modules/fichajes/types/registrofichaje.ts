import { TipoEventoFichaje } from "../../tipos_eventos_fichaje/types/tipos_evento_fichaje";
import { Trabajador } from "../../trabajadores/types/trabajador";

/**
 * Listado estático de los tipos de eventos o acciones posibles en un fichaje laboral.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const TIPOS_FICHAJE = {
  /** Evento que registra el inicio de la jornada laboral. */
  ENTRADA: "ENTRADA",
  /** Evento que registra la finalización de la jornada laboral. */
  SALIDA: "SALIDA",
  /** Evento que registra el comienzo de una pausa o descanso durante la jornada. */
  INICIO_PAUSA: "INICIO_PAUSA",
  /** Evento que registra la finalización de la pausa o descanso. */
  FIN_PAUSA: "FIN_PAUSA",
} as const;

/**
 * Tipo de unión que representa los tipos de eventos o acciones posibles en un fichaje laboral.
 */
export type TipoFichaje = (typeof TIPOS_FICHAJE)[keyof typeof TIPOS_FICHAJE];

/**
 * Listado estático de los posibles estados de validez de un registro de fichaje.
 * Sincronizado con 'EstadoFichajeEnum' de Pydantic.
 */
export const ESTADOS_FICHAJE = {
  /** El registro de fichaje es correcto y validado por el sistema. */
  VALIDO: "Válido",
  /** El registro de fichaje se encuentra pendiente de revisión o corrección manual. */
  PENDIENTE_REVISION: "Pendiente_revisión",
} as const;

/**
 * Tipo de unión que representa los posibles estados de validez de un registro de fichaje.
 */
export type EstadoFichaje =
  (typeof ESTADOS_FICHAJE)[keyof typeof ESTADOS_FICHAJE];

/**
 * Catálogo ordenado de los días de la semana utilizado para la planificación de turnos y reportes.
 */
export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/**
 * Esquema base con las propiedades comunes compartidas para la validación de un fichaje.
 * Sincronizado con 'FichajeBase' de Pydantic.
 */
export interface FichajeBase {
  /** Identificador único UUID de la empresa. */
  empresa_id: string;
  /** Identificador único UUID del trabajador. */
  trabajador_id: string;
  /** Identificador único UUID del centro de trabajo. */
  centro_trabajo_id: string;
  /** Identificador único UUID del tipo de evento. */
  tipo_evento_id: string;
  /** Método utilizado para realizar el marcaje. */
  metodo_fichaje: string;
}

/**
 * Esquema estricto para los parámetros de creación de fichajes basado en el modelo Pydantic `FichajeCreate`.
 */
export interface FichajeCreateParams {
  /** Identificador UUID del Tenant corporativo. */
  empresa_id: string;
  /** Identificador UUID del expediente del empleado. */
  trabajador_id: string;
  /** Identificador UUID del centro de trabajo asignado. */
  centro_trabajo_id: string;
  /** Identificador del tipo de evento horario. */
  tipo_evento_id: string;
  /** Canal: app_movil, web, qr, etc. */
  metodo_fichaje: string;
  /** Origen del fichaje. */
  origen?: string;
  /** Estado de validez. */
  estado?: string;
  /** Coordenada de latitud. */
  latitud?: number | null;
  /** Coordenada de longitud. */
  longitud?: number | null;
  /** IP resuelta por la red. */
  ip_address?: string | null;
  /** ID del motivo de pausa si aplica. */
  motivo_pausa_id?: number | null;
  /** ID del dispositivo de fichaje. */
  dispositivo_id?: string | null;
  /** Fecha y hora reportada por el dispositivo en formato de cadena. */
  fecha_hora_dispositivo?: string | null;
  /** Observaciones adicionales. */
  observaciones?: string | null;
  /** Firma digitalizada codificada en Base64 o URL del almacenamiento. */
  firma_digital?: string | null;
  /** Bandera para forzar fichaje en festivo como horas extra. */
  forzar_hora_extra?: boolean;
}

/**
 * Esquema base y simple utilizado para estructurar las respuestas JSON que el servidor envía de vuelta.
 * Sincronizado con 'FichajeSimpleResponse' de Pydantic.
 */
export interface FichajeSimpleResponse extends FichajeBase {
  /** Identificador único UUID autogenerado (gen_random_uuid). */
  id: string;
  /** Instante oficial del fichaje con zona horaria (referencia legal) en formato ISO DateTime. */
  fecha_hora: string;
  /** Origen del registro. */
  origen: string;
  /** Estado de validez del fichaje. */
  estado: string;
  /** Firma SHA-256 de seguridad de la fila. */
  hash_integridad: string;
  /** Fecha de inserción real e inmutable calculada por el servidor (now) en formato ISO DateTime. */
  created_at: string;
  /** ID del motivo de pausa. */
  motivo_pausa_id?: number | null;
  /** Fecha y hora reportada por el dispositivo. */
  fecha_hora_dispositivo?: string | null;
  /** ID del dispositivo de fichaje. */
  dispositivo_id?: string | null;
  /** Latitud. */
  latitud?: number | null;
  /** Longitud. */
  longitud?: number | null;
  /** ID del fichaje anterior al que reemplaza este registro. */
  fichaje_sustituido_id?: string | null;
  /** Observaciones adicionales. */
  observaciones?: string | null;
  /** Firma digitalizada almacenada. */
  firma_digital?: string | null;
}

/**
 * Representa la definición completa de un registro de fichaje con sus relaciones anidadas en la plataforma.
 * Sincronizado con 'FichajeResponse' de Pydantic.
 */
export interface RegistroFichaje extends FichajeSimpleResponse {
  /** Nombre del turno laboral asignado al trabajador en el momento del fichaje (campo complementario). */
  turno_nombre?: string;
  /** Detalles del tipo de evento asociado. */
  tipo_evento?: TipoEventoFichaje | null;
  /** Detalles del trabajador asociado. */
  trabajador?: Trabajador | null;
}
