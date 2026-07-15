// Definición del Enum para los tipos de evento de fichaje
export enum TipoFichaje {
  ENTRADA = 1,
  SALIDA = 2,
  INICIO_PAUSA = 3,
  FIN_PAUSA = 4,
}

export enum EstadoFichaje {
  VALIDO = "Válido",
  PENDIENTE_REVISION = "Pendiente_revisión",
}

export interface RegistroFichaje {
  id: string;
  trabajador_id: string;
  trabajador_nombre: string;
  turno_nombre: string;
  fecha_hora: string;
  tipo_evento: TipoFichaje;
  metodo_fichaje: string;
  observaciones?: string | null;
  estado: EstadoFichaje;
}
