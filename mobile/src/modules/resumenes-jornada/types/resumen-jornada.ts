import { Empresa } from "../../empresas/types/empresa";
import { Trabajador } from "../../trabajadores/types/trabajador";

/**
 * Representa la estructura base con los campos comunes para la gestión de resúmenes de jornada.
 */
export interface ResumenJornadaBase {
  /** Identificador único de la empresa asociada (Tenant de aislamiento multiempresa). */
  empresa_id: string;
  /** Identificador único universal (UUID) del trabajador asociado. */
  trabajador_id: string;
  /** Fecha correspondiente al resumen de la jornada en formato "AAAA-MM-DD". */
  fecha: string;
}

/**
 * Esquema para la creación o registro de un nuevo resumen de jornada en la plataforma (POST /api/resumenes-jornada).
 */
export interface ResumenJornadaCreate extends ResumenJornadaBase {
  /** Cantidad total de minutos computados como trabajo efectivo. */
  minutos_trabajados?: number;
  /** Cantidad total de minutos computados en pausas o descansos. */
  minutos_pausa?: number;
  /** Cantidad total de minutos computados como horas extra. */
  minutos_extra?: number;
  /** Indicador booleano que señala si la jornada cuenta con alguna incidencia registrada. */
  tiene_incidencia?: boolean;
  /** Indicador booleano que determina si la jornada se encuentra cerrada o finalizada. */
  cerrado?: boolean;
  /** Marca temporal o hora de inicio de la entrada en formato ISO DateTime o cadena de hora, si aplica. */
  hora_entrada?: string | null;
  /** Marca temporal o hora de finalización de la salida en formato ISO DateTime o cadena de hora, si aplica. */
  hora_salida?: string | null;
}

/**
 * Representa la definición base y completa del resumen de una jornada laboral en la plataforma (Tabla: resumenes_jornada).
 */
export interface ResumenJornada extends ResumenJornadaBase {
  /** Identificador UUID único del registro de resumen de jornada. */
  id: string;
  /** Cantidad total de minutos computados como trabajo efectivo. */
  minutos_trabajados: number;
  /** Cantidad total de minutos computados en pausas o descansos. */
  minutos_pausa: number;
  /** Cantidad total de minutos computados como horas extra. */
  minutos_extra: number;
  /** Indicador booleano que señala si la jornada cuenta con alguna incidencia registrada. */
  tiene_incidencia: boolean;
  /** Indicador booleano que determina si la jornada se encuentra cerrada o finalizada. */
  cerrado: boolean;
  /** Marca de tiempo de la última actualización del registro en formato ISO DateTime. */
  actualizado_en: string;
  /** Marca temporal o hora de inicio de la entrada en formato ISO DateTime o cadena de hora, si aplica. */
  hora_entrada?: string | null;
  /** Marca temporal o hora de finalización de la salida en formato ISO DateTime o cadena de hora, si aplica. */
  hora_salida?: string | null;

  /** Relación opcional con la entidad empresa asociada cargada por el backend. */
  empresa?: Empresa | null;
  /** Relación opcional con la entidad trabajador asociada cargada por el backend. */
  trabajador?: Trabajador | null;
}
