import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import { Empresa } from "../../empresas/types/empresa";
import { Festivo } from "../../festivos/types/festivo";

/**
 * Representa la estructura completa de un calendario laboral con sus festivos anidados.
 * Sincronizado con el esquema 'CalendarioConFestivosResponse' del backend.
 */
export interface CalendarioFestivo {
  /** Identificador único universal (UUID v4) del calendario laboral. */
  id: string;
  /** Identificador UUID único de la empresa u organización propietaria (tenant). */
  empresa_id: string;
  /** Identificador UUID único del centro de trabajo o sede física vinculada. */
  centro_trabajo_id: string | null;
  /** Nombre identificativo o descriptivo del calendario laboral, o nulo si no se especifica. */
  nombre: string;
  /** Año natural al que corresponde el calendario laboral. */
  anio: number;
  /** Indica si el calendario laboral está activo. */
  activo: boolean;
  /** Listado de días festivos asociados y anidados al calendario. */
  festivos: Festivo[];
  /** Relación opcional enriquecida para cargas anidadas de la empresa vinculada. */
  empresa?: Empresa | null;
  /** Relación opcional enriquecida para cargas anidadas del centro de trabajo vinculado. */
  centro_trabajo?: CentroTrabajo | null;
}

/**
 * Estructura de datos requerida para el registro o creación de un nuevo calendario laboral.
 * Sincronizado exactamente con el esquema del backend.
 */
export interface CalendarioLaboralCreate {
  /** Identificador UUID único de la empresa u organización propietaria (tenant). */
  empresa_id: string;
  /** Identificador UUID del centro de trabajo vinculado, o nulo si es general. */
  centro_trabajo_id?: string | null;
  /** Nombre identificativo del calendario laboral. */
  nombre: string;
  /** Año natural al que corresponde el calendario laboral. */
  anio: number;
}

/**
 * Estructura de datos para la actualización parcial o total de los parámetros de un calendario laboral existente.
 */
export interface CalendarioLaboralUpdate {
  /** Identificador UUID actualizado del centro de trabajo vinculado. */
  centro_trabajo_id?: string | null;
  /** Nuevo nombre identificativo del calendario laboral. */
  nombre?: string;
  /** Año natural actualizado al que corresponde el calendario. */
  anio?: number;
  /** Estado de activación del calendario. */
  activo?: boolean;
}

/**
 * Representa la respuesta estándar de un calendario laboral individual sin festivos anidados.
 * Sincronizado con el esquema 'CalendarioLaboralResponse' del backend.
 */
export interface CalendarioLaboralResponse {
  /** Identificador único universal (UUID v4) del calendario laboral. */
  id: string;
  /** Identificador UUID único de la empresa u organización propietaria (tenant). */
  empresa_id: string;
  /** Identificador UUID del centro de trabajo vinculado. */
  centro_trabajo_id: string | null;
  /** Nombre identificativo o descriptivo del calendario laboral. */
  nombre: string;
  /** Año natural al que corresponde el calendario laboral. */
  anio: number;
  /** Indica si el calendario laboral está activo. */
  activo: boolean;
  /** Marca de tiempo (ISO 8601 con zona horaria) de la fecha de creación del registro. */
  created_at: string;

  /** Relación opcional enriquecida para cargas anidadas de la empresa vinculada. */
  empresa?: Empresa | null;
  /** Relación opcional enriquecida para cargas anidadas del centro de trabajo vinculado. */
  centro_trabajo?: CentroTrabajo | null;
}
