import { EstadoFichajeEnum, MetodoFichajeEnum, OrigenFichajeEnum, TipoEventoFichajeEnum } from "../../../constants/enums";
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
/** Valores serializados por el esquema del backend. */
export const TIPOS_EVENTO_FICHAJE_API = TipoEventoFichajeEnum;
export type TipoEventoFichajeApi = (typeof TIPOS_EVENTO_FICHAJE_API)[keyof typeof TIPOS_EVENTO_FICHAJE_API];

/**
 * Listado estático de los posibles estados de validez de un registro de fichaje.
 * Sincronizado con 'EstadoFichajeEnum' de Pydantic.
 */
export const ESTADOS_FICHAJE = EstadoFichajeEnum;

/**
 * Tipo de unión que representa los posibles estados de validez de un registro de fichaje.
 */
export type EstadoFichaje =
  (typeof ESTADOS_FICHAJE)[keyof typeof ESTADOS_FICHAJE];

export const METODOS_FICHAJE = MetodoFichajeEnum;
export type MetodoFichaje = (typeof METODOS_FICHAJE)[keyof typeof METODOS_FICHAJE];

export const ORIGENES_FICHAJE = OrigenFichajeEnum;
export type OrigenFichaje = (typeof ORIGENES_FICHAJE)[keyof typeof ORIGENES_FICHAJE];

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
  tipo_evento: TipoEventoFichajeApi;
  metodo_fichaje: MetodoFichaje;
  fecha_hora: string;
  fecha_hora_dispositivo: string;
  origen: OrigenFichaje;
  estado: EstadoFichaje;
  latitud: number | null;
  longitud: number | null;
  ip_address: string | null;
  observaciones: string | null;
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
  tipo_evento: TipoFichaje;
  /** Estado aceptado actualmente por el flujo de fichaje de la interfaz. */
  estado?: EstadoFichaje;
  /** Canal: app_movil, web, qr, etc. */
  metodo_fichaje: MetodoFichaje;
  fecha_hora?: string;
  fecha_hora_dispositivo: string;
  /** Coordenada de latitud. */
  latitud?: number | null;
  /** Coordenada de longitud. */
  longitud?: number | null;
  /** IP resuelta por la red. */
  ip_address?: string | null;
  /** ID del motivo de pausa si aplica. */
  motivo_pausa_id?: string | null;
  /** ID del dispositivo de fichaje. */
  dispositivo_id?: string | null;
  /** Fecha y hora reportada por el dispositivo en formato de cadena. */
  /** Observaciones adicionales. */
  observaciones?: string | null;
  /** Firma digitalizada codificada en Base64 o URL del almacenamiento. */
  firma_digital: string;
  /** Bandera para forzar fichaje en festivo como horas extra. */
  forzar_hora_extra?: boolean;
}

/** Cuerpo HTTP exacto de FichajeCreate en el backend. */
export interface FichajeCreateRequest extends Omit<FichajeCreateParams, "tipo_evento" | "fecha_hora"> {
  tipo_evento: TipoEventoFichajeApi;
  fecha_hora: string;
}

/**
 * Esquema base y simple utilizado para estructurar las respuestas JSON que el servidor envía de vuelta.
 * Sincronizado con 'FichajeSimpleResponse' de Pydantic.
 */
export interface FichajeSimpleResponse extends FichajeBase {
  /** Identificador único UUID autogenerado (gen_random_uuid). */
  id: string;
  /** Instante oficial del fichaje con zona horaria (referencia legal) en formato ISO DateTime. */
  empresa_id: string;
  trabajador_id: string;
  centro_trabajo_id: string;
  dispositivo_id: string | null;
  fichaje_sustituido_id: string | null;
  motivo_pausa_id: string | null;
  /** Firma SHA-256 de seguridad de la fila. */
  hash_integridad: string;
  /** Fecha de inserción real e inmutable calculada por el servidor (now) en formato ISO DateTime. */
  created_at: string;
  /** ID del motivo de pausa. */
}

export interface FichajeResponse extends FichajeSimpleResponse {
  empresa: import("../../empresas/types/empresa").Empresa | null;
  trabajador: Trabajador | null;
  centro_trabajo: import("../../centros-trabajo/types/centro-trabajo").CentroTrabajo | null;
  dispositivo: import("../../dispositivos-fichaje/types/dispositivo-fichaje").DispositivoSimpleResponse | null;
  fichaje_sustituido: FichajeSimpleResponse | null;
  motivo_pausa: import("../../motivos-pausa/types/motivo-pausa").MotivoPausaSimpleResponse | null;
}

/**
 * Representa la definición completa de un registro de fichaje con sus relaciones anidadas en la plataforma.
 * Sincronizado con 'FichajeResponse' de Pydantic.
 */
export interface RegistroFichaje extends Omit<FichajeResponse, "tipo_evento"> {
  /** Evento normalizado para presentación en la interfaz. */
  tipo_evento: TipoFichaje;
  /** Algunos endpoints de detalle incluyen la firma digital. */
  firma_digital?: string | null;
  /** Nombre del turno laboral asignado al trabajador en el momento del fichaje (campo complementario). */
  turno_nombre: string;
  /** Detalles del trabajador asociado. */
  trabajador: Trabajador;
  correccion_aprobada?: {
    id: string;
    tipo_correccion: string;
    motivo: string;
    fecha_solicitud: string;
    fecha_resolucion?: string | null;
    valor_nuevo?: Record<string, any> | null;
    firma_solicitante?: string | null;
    firma_resolutor?: string | null;
    solicitante?: string | null;
    resolutor?: string | null;
    solicitante_tipo?: string | null;
    resolutor_tipo?: string | null;
  } | null;
}
