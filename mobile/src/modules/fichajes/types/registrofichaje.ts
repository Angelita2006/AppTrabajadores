export interface RegistroFichaje {
  id: string;
  trabajador_id: string;
  trabajador_nombre: string;
  turno_nombre: string;
  fecha_hora: string; // Formato "YYYY-MM-DD HH:MM:SS" o ISO string
  tipo_evento: "ENTRADA" | "SALIDA" | "INICIO_PAUSA" | "FIN_PAUSA";
  metodo_fichaje: string;
  observaciones?: string | null;
}
