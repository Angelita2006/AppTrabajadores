import { Trabajador } from "../../trabajadores/types/trabajador";
import { ItemTurno } from "../../turnos/types/turno";

/**
 * Representa el cuadrante temporal asignado al empleado (Tabla: asignaciones_turno)
 */
export interface AsignacionTurno {
  id: string; // UUID de la asignación
  empresa_id: string; // Aislamiento Multiempresa
  trabajador_id: string; // Expediente vinculado
  turno_id: string; // Turno asignado
  fecha_inicio: string; // Formato AAAA-MM-DD
  fecha_fin?: string | null; // NULL si es indefinido o indefinido temporal
  created_at: string;
  turno?: ItemTurno | null;
  trabajador?: Trabajador | null;
}
