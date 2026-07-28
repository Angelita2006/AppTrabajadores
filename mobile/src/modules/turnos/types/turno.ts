import { Empresa } from "../../empresas/types/empresa";

/**
 * Representa la definición base de un horario laboral (Tabla: turnos)
 */
export interface Turno {
  id: string; // UUID v4 del turno maestro
  empresa_id: string; // UUID v4 del tenant corporativo
  nombre: string; // Ej: "Mañana Rotativo", "Nocturno Intensivo"
  hora_inicio: string; // Formato HH:MM:SS o HH:MM
  hora_fin: string; // Formato HH:MM:SS o HH:MM
  duracion_pausa_minutos: number; // Minutos de descanso reglamentarios
  color_hex?: string | null; // Color identificativo opcional para UI
  dias_semana: number[]; // Días aplicables: 1=lunes ... 7=domingo
  created_at: string; // ISO DateTime string con zona horaria

  // Relación opcional cargada por el backend si se requiere
  empresa?: Empresa | null;
}

/**
 * Esquema para la creación de un nuevo turno laboral
 */
export interface TurnoCreate {
  empresa_id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_pausa_minutos?: number;
  dias_semana: number[];
  color_hex?: string | null;
}

/**
 * Esquema para la actualización parcial de un turno existente
 */
export interface TurnoUpdate {
  nombre?: string;
  hora_inicio?: string;
  hora_fin?: string;
  duracion_pausa_minutos?: number;
  dias_semana?: number[];
  color_hex?: string | null;
}
