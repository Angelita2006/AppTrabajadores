import { Empresa } from "../../empresas/types/empresa";

export interface MotivoPausaBase {
  nombre: string;
  computa_como_trabajo?: boolean | null;
  duracion_max_minutos?: number | null;
}
export interface MotivoPausaCreate extends MotivoPausaBase { empresa_id: string }
export interface MotivoPausaUpdate {
  nombre?: string | null;
  computa_como_trabajo?: boolean | null;
  duracion_max_minutos?: number | null;
}
export interface MotivoPausaSimpleResponse extends MotivoPausaBase {
  id: string;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}
export interface MotivoPausaResponse extends MotivoPausaSimpleResponse {
  empresa: Empresa | null;
}

