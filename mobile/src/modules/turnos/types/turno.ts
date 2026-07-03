/**
 * Representa la definición base de un horario (Tabla: turnos)
 */
export interface Turno {
  id: string; // Código UUID del turno
  empresa_id: string; // Tenant corporativo
  nombre: string; // Ej: "Mañana Rotativo", "Nocturno Intensivo"
  hora_inicio: string; // Formato HH:MM:SS
  hora_fin: string; // Formato HH:MM:SS
  minutos_pausa_obligatoria: number; // Minutos de descanso reglamentarios
  color_hex?: string | null; // Color identificativo para pintar el calendario de la UI
}

export interface ItemTurno {
  id: string; // Código UUID del item turno
  turno_id: string; // Código UUID del turno
  empresa_id: string; // Tenant corporativo
  nombre: string; // Ej: "Mañana Rotativo", "Nocturno Intensivo"
  hora_inicio: string; // Formato HH:MM:SS
  hora_fin: string; // Formato HH:MM:SS
  minutos_pausa_obligatoria: number; // Minutos de descanso reglamentarios
  color_hex?: string | null; // Color identificativo para pintar el calendario de la UI
  fecha_real: string;
}

export interface TurnoTrabajadorResponse {
  id: string;
  nombre: string; // Ej: "Mañana", "Tarde Rotativo"
  hora_inicio: string; // Ej: "08:00"
  hora_fin: string; // Ej: "16:00"
  dias_semana?: string; // Ej: "L-V", "L-S" o "Lunes a Viernes"
  tipo_jornada?: string; // Ej: "Completa", "Parcial"
  duracion_pausa_minuto: number;
}

export interface TurnoCreate {
  empresa_id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_pausa_minutos: number;
  dias_semana: number[];
}
