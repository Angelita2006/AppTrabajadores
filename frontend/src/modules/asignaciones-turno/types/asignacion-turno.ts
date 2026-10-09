import { Trabajador } from "../../trabajadores/types/trabajador";
import { Turno } from "../../turnos/types/turno";

/**
 * Representa la estructura de una asignación de turno individual devuelta por la API.
 * Sincronizado con el esquema 'AsignacionTurnoResponse' del backend.
 */
export interface AsignacionTurno {
  /** Identificador único universal (UUID v4) de la asignación de turno. */
  id: string;
  /** Identificador UUID único del trabajador titular de la asignación. */
  trabajador_id: string;
  /** Identificador UUID único del turno laboral teórico asignado. */
  turno_id: string;
  /** Fecha de inicio de vigencia de la asignación en formato estándar "AAAA-MM-DD". */
  fecha_inicio: string;
  /** Fecha de finalización de la vigencia en formato "AAAA-MM-DD", o nula si es indefinida. */
  fecha_fin: string | null;
  /** Marca de tiempo (ISO 8601 con zona horaria) de la fecha de creación del registro. */
  created_at: string;

  /** Relación opcional enriquecida para cargas anidadas del turno vinculado. */
  turno?: Turno | null;
  /** Relación opcional enriquecida para cargas anidadas del trabajador vinculado. */
  trabajador?: Trabajador | null;
}

/**
 * Estructura de datos requerida para la creación individual de una asignación de turno.
 * Sincronizado con el esquema 'AsignacionTurnoCreate' del backend.
 */
export interface AsignacionTurnoCreate {
  /** Identificador UUID único del trabajador al que se le asigna el turno. */
  trabajador_id: string;
  /** Identificador UUID único del turno laboral teórico a asignar. */
  turno_id: string;
  /** Fecha de inicio de vigencia de la asignación en formato estándar "AAAA-MM-DD". */
  fecha_inicio: string;
  /** Fecha opcional de finalización de la vigencia en formato "AAAA-MM-DD". */
  fecha_fin?: string | null;
}

/**
 * Estructura de datos para la asignación masiva de múltiples turnos a un trabajador de forma atómica.
 * Sincronizado con el esquema 'AsignacionTurnoMasivaCreate' del backend.
 */
export interface AsignacionTurnoMasivaCreate {
  /** Identificador UUID único del trabajador al que se le asignan los turnos masivamente. */
  trabajador_id: string;
  /** Listado de identificadores UUID de los turnos a asignar (entre 1 y 100 elementos). */
  turnos_ids: string[];
  /** Fecha de inicio de vigencia para el bloque de turnos en formato estándar "AAAA-MM-DD". */
  fecha_inicio: string;
  /** Fecha opcional de finalización de la vigencia en formato "AAAA-MM-DD". */
  fecha_fin?: string | null;
}
