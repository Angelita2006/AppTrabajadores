// Definición del Enum ajustada a los strings que devuelve el backend
export enum TipoFichaje {
  ENTRADA = "ENTRADA",
  SALIDA = "SALIDA",
  INICIO_PAUSA = "INICIO_PAUSA",
  FIN_PAUSA = "FIN_PAUSA",
}

export const obtenerIdNumericoTipo = (tipo: TipoFichaje): number => {
  switch (tipo) {
    case TipoFichaje.ENTRADA:
      return 1;
    case TipoFichaje.SALIDA:
      return 2;
    case TipoFichaje.INICIO_PAUSA:
      return 3;
    case TipoFichaje.FIN_PAUSA:
      return 4;
    default:
      return 1;
  }
};

export enum EstadoFichaje {
  VALIDO = "Válido",
  PENDIENTE_REVISION = "Pendiente_revisión",
}

export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export interface RegistroFichaje {
  id: string;
  trabajador_id: string;
  trabajador_nombre: string;
  turno_nombre: string;
  fecha_hora: string;
  tipo_evento_id: number;
  metodo_fichaje: string;
  observaciones?: string | null;
  estado: EstadoFichaje | string;
}

// Interfaz estricta para la creación de fichajes basada en el esquema de Pydantic FichajeCreate
export interface FichajeCreateParams {
  empresa_id: string;
  trabajador_id: string;
  centro_trabajo_id: string;
  tipo_evento_id: string;
  metodo_fichaje: string;
  origen?: string;
  estado?: string;
  latitud?: number | null;
  longitud?: number | null;
  ip_address?: string | null;
  motivo_pausa_id?: number | null;
  dispositivo_id?: string | null;
  fecha_hora_dispositivo?: string | null;
  observaciones?: string | null;
  forzar_hora_extra: boolean;
}
