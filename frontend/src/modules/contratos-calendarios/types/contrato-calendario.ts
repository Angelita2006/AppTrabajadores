import { CalendarioLaboralResponse } from "../../calendarios-laborales/types/calendario";
import { Contrato } from "../../contratos/types/contrato";

export interface ContratoCalendarioCreate {
  contrato_id: string;
  calendario_laboral_id: string;
}
export interface ContratoCalendarioUpdate { activa?: boolean | null }
export interface ContratoCalendarioSimpleResponse {
  id: string;
  contrato_id: string;
  calendario_laboral_id: string;
  activa: boolean | null;
  created_at: string;
  updated_at: string;
}
export interface ContratoCalendarioResponse extends ContratoCalendarioSimpleResponse {
  contrato: Contrato | null;
  calendario_laboral: CalendarioLaboralResponse | null;
}

