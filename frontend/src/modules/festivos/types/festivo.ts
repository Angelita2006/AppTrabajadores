import { CalendarioLaboralResponse } from "../../calendarios-laborales/types/calendario";

/**
 * Listado estático de los ámbitos o tipos posibles de un día festivo en el calendario laboral,
 * sincronizados con los valores del backend.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const TIPOS_FESTIVO = {
  /** Festivo de ámbito nacional o estatal. */
  NACIONAL: "Nacional",
  /** Festivo de ámbito autonómico o regional. */
  AUTONOMICO: "Autonómico",
  /** Festivo de ámbito local o municipal. */
  LOCAL: "Local",
} as const;

/**
 * Tipo de unión que representa los ámbitos o tipos posibles de un día festivo en el calendario laboral.
 */
export type TipoFestivo = (typeof TIPOS_FESTIVO)[keyof typeof TIPOS_FESTIVO];

/**
 * Representa la definición base y completa de un día festivo en la plataforma (Tabla: festivos).
 * Sincronizado con el esquema 'FestivoResponse' del backend (incluyendo el calendario anidado opcional).
 */
export interface Festivo {
  /** Identificador UUID único del registro de festivo en el backend. */
  id: string;
  /** Identificador UUID único del calendario laboral asociado al festivo. */
  calendario_id: string;
  /** Fecha correspondiente al día festivo en formato "AAAA-MM-DD". */
  fecha: string;
  /** Descripción detallada o nombre del día festivo, si aplica. */
  descripcion: string | null;

  /** Ámbito o tipo de festivo (puede ser de tipo `TipoFestivo` o texto plano, por defecto "nacional"). */
  tipo: TipoFestivo | string;
  /** Relación opcional enriquecida para cargas anidadas del calendario laboral vinculado. */
  calendario?: CalendarioLaboralResponse | null;
}

/**
 * Esquema para la creación o registro de un nuevo día festivo en el sistema (POST /api/festivos).
 * Sincronizado con 'FestivoCreate' del backend (donde descripción es opcional).
 */
export interface FestivoCreate {
  /** Identificador UUID único del calendario laboral al que se asociará el festivo. */
  calendario_id: string;
  /** Fecha correspondiente al nuevo día festivo en formato "AAAA-MM-DD". */
  fecha: string;
  /** Ámbito o tipo opcional del festivo (por defecto "nacional"). */
  tipo?: TipoFestivo | string;
  /** Descripción detallada o nombre opcional del día festivo. */
  descripcion?: string | null;
}

/**
 * Esquema para la actualización o modificación de los datos de un día festivo existente (PUT /api/festivos/{id}).
 * Sincronizado con 'FestivoUpdate' del backend (donde todos los campos son opcionales para permitir actualizaciones parciales).
 */
export interface FestivoUpdate {
  /** Nuevo identificador UUID del calendario laboral. */
  calendario_id: string;
  /** Nueva fecha a actualizar para el festivo en formato "AAAA-MM-DD". */
  fecha: string;
  /** Nuevo ámbito o tipo a actualizar para el festivo. */
  tipo: TipoFestivo;
  /** Nueva descripción o nombre actualizado para el festivo. */
  descripcion: string;
}
