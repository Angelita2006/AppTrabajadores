/**
 * Representa la definición base de un horario (Tabla: turnos)
 */
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
  dias_semana: number[];
  tipo_jornada: string;
  fecha_asignacion_inicio: string;
  fecha_asignacion_fin: string;
}

export interface TurnoCreate {
  empresa_id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_pausa_minutos: number;
  dias_semana: number[];
}
