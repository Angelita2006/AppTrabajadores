export interface ResumenJornadaBase {
  empresa_id: string;
  trabajador_id: string;
  fecha: string; // Formato AAAA-MM-DD
}

export interface ResumenJornadaCreate extends ResumenJornadaBase {
  minutos_trabajados?: number;
  minutos_pausa?: number;
  minutos_extra?: number;
  tiene_incidencia?: boolean;
  cerrado?: boolean;
  hora_entrada?: string | null; // ISO string o Date string
  hora_salida?: string | null; // ISO string o Date string
}

export interface ResumenJornada extends ResumenJornadaBase {
  id: string;
  minutos_trabajados: number;
  minutos_pausa: number;
  minutos_extra: number;
  tiene_incidencia: boolean;
  cerrado: boolean;
  actualizado_en: string; // ISO string
  hora_entrada?: string | null;
  hora_salida?: string | null;
}
