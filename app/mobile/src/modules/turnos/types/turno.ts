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
