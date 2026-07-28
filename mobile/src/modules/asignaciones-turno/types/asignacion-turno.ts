import { Trabajador } from "../../trabajadores/types/trabajador";
import { Turno } from "../../turnos/types/turno";

/**
 * Representa la estructura de una asignación de turno individual devuelta por la API.
 * Coincide con AsignacionTurnoResponse del backend.
 */
export interface AsignacionTurno {
  id: string; // UUID v4 mapeado como string
  trabajador_id: string; // UUID v4 del trabajador
  turno_id: string; // UUID v4 del turno laboral teórico
  fecha_inicio: string; // Formato AAAA-MM-DD
  fecha_fin: string | null; // Fecha opcional de finalización de la vigencia
  created_at: string | null; // ISO DateTime string de creación del registro
  turno?: Turno | null;
  trabajador?: Trabajador | null;
}

/**
 * Esquema para la creación individual de una asignación de turno.
 * Coincide con AsignacionTurnoCreate del backend.
 */
export interface AsignacionTurnoCreate {
  trabajador_id: string;
  turno_id: string;
  fecha_inicio: string; // Formato AAAA-MM-DD
  fecha_fin?: string | null; // Formato AAAA-MM-DD opcional
}

/**
 * Esquema para la asignación masiva de múltiples turnos a un trabajador de forma atómica.
 * Coincide con AsignacionTurnoMasivaCreate del backend.
 */
export interface AsignacionTurnoMasivaCreate {
  trabajador_id: string;
  turnos_ids: string[]; // Lista de IDs de turnos (1 a 100)
  fecha_inicio: string; // Formato AAAA-MM-DD
  fecha_fin?: string | null; // Formato AAAA-MM-DD opcional
}
