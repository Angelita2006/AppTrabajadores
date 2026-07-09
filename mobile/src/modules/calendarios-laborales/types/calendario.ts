import { Festivo } from "../../festivos/types/festivo";

export interface CalendarioFestivo {
  id?: string;
  empresa_id: string;
  centro_trabajo_id: string;
  nombre: string;
  anio: number;
  festivos: Festivo[];
}

export interface CalendarioLaboralCreate {
  empresa_id: string;
  anio: number;
  nombre: string;
  centro_trabajo_id?: string | null;
}

export interface CalendarioLaboralUpdate {
  anio?: number;
  nombre?: string;
  centro_trabajo_id?: string | null;
}

export interface CalendarioLaboralResponse {
  id: string;
  empresa_id: string;
  anio: number;
  nombre: string;
  centro_trabajo_id: string | null;
}
