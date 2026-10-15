import { AccionRetencionEnum } from "../../../constants/enums";
import { Empresa } from "../../empresas/types/empresa";

export type AccionRetencion = (typeof AccionRetencionEnum)[keyof typeof AccionRetencionEnum];
export interface PoliticaRetencionBase {
  anios_conservacion: number;
  accion_tras_periodo: AccionRetencion;
}
export interface PoliticaRetencionCreate extends PoliticaRetencionBase { empresa_id: string }
export interface PoliticaRetencionUpdate {
  anios_conservacion?: number | null;
  accion_tras_periodo?: AccionRetencion | null;
}
export interface PoliticaRetencionSimpleResponse extends PoliticaRetencionBase {
  id: string;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}
export interface PoliticaRetencionResponse extends PoliticaRetencionSimpleResponse {
  empresa: Empresa | null;
}

