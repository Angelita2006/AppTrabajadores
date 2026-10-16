import { Empresa } from "../../empresas/types/empresa";
import { TrabajadorSimpleResponse } from "../../trabajadores/types/trabajador";

/** Fields shared by the Pydantic summary schemas. */
export interface ResumenJornadaBase {
  minutos_trabajados: number;
  minutos_pausa: number;
  minutos_extra: number;
  tiene_incidencias?: boolean | null;
  cerrado?: boolean | null;
  hora_entrada: string;
  hora_salida: string;
}

/** Request body matching ResumenJornadaCreate. */
export interface ResumenJornadaCreate extends ResumenJornadaBase {
  empresa_id: string;
  trabajador_id: string;
}

/** Request body matching ResumenJornadaUpdate. */
export interface ResumenJornadaUpdate {
  minutos_trabajados?: number | null;
  minutos_pausa?: number | null;
  minutos_extra?: number | null;
  tiene_incidencias?: boolean | null;
  cerrado?: boolean | null;
  hora_entrada?: string | null;
  hora_salida?: string | null;
}

/** Response body matching ResumenJornadaSimpleResponse. */
export interface ResumenJornadaSimpleResponse extends ResumenJornadaBase {
  id: string;
  empresa_id: string;
  trabajador_id: string;
  created_at: string;
  updated_at: string;
}

/** Response body matching ResumenJornadaResponse. */
export interface ResumenJornadaResponse extends ResumenJornadaSimpleResponse {
  empresa?: Empresa | null;
  trabajador?: TrabajadorSimpleResponse | null;
}

/** Modelo de vista; `fecha` se calcula a partir de la fecha de consulta o de `hora_entrada`. */
export interface ResumenJornada extends ResumenJornadaResponse {
  fecha: string;
}
