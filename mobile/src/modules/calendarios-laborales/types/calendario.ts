import { Festivo } from "../../festivos/types/festivo";

/**
 * Representa la estructura de un calendario laboral completo (con sus festivos anidados)
 * Coincide con CalendarioConFestivosResponse del backend.
 */
export interface CalendarioFestivo {
  id: string; // Mapea UUID4
  empresa_id?: string | null; // Tenant asociado
  centro_trabajo_id?: string | null; // Sede física opcional
  nombre?: string | null;
  anio: number;
  festivos: Festivo[];
}

/**
 * Esquema para la creación de un nuevo calendario laboral
 */
export interface CalendarioLaboralCreate {
  empresa_id: string;
  anio: number;
  nombre: string;
  centro_trabajo_id?: string | null;
}

/**
 * Esquema para la actualización parcial o total de un calendario laboral
 */
export interface CalendarioLaboralUpdate {
  anio?: number;
  nombre?: string;
  centro_trabajo_id?: string | null;
}

/**
 * Representa la respuesta estándar de un calendario laboral individual
 * Coincide con CalendarioLaboralResponse del backend.
 */
export interface CalendarioLaboralResponse {
  id: string;
  empresa_id: string;
  anio: number;
  nombre: string;
  created_at: string; // Mapea DateTime(True) en formato ISO string
  centro_trabajo_id: string | null;
}
