// Definición del Enum para los tipos de evento de fichaje
export enum TipoFichaje {
  ENTRADA = 1,
  SALIDA = 2,
  INICIO_PAUSA = 3,
  FIN_PAUSA = 4,
}

export interface RegistroFichaje {
  id: string;
  trabajador_id: string;
  trabajador_nombre: string;
  turno_nombre: string;
  fecha_hora: string; // Formato "YYYY-MM-DD HH:MM:SS" o ISO string
  tipo_evento: TipoFichaje; // Ahora utiliza el Enum fuertemente tipado
  metodo_fichaje: string;
  observaciones?: string | null;
}
