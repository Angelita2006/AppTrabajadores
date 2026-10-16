import {
  CicloFacturacionEnum,
  EstadoSuscripcionEnum,
  PlanLicenciaEnum,
} from "../../../constants/enums";
import { Empresa } from "../../empresas/types/empresa";

export const PLANES_LICENCIA = PlanLicenciaEnum;
export type PlanLicencia =
  (typeof PLANES_LICENCIA)[keyof typeof PLANES_LICENCIA];

export const CICLOS_FACTURACION = CicloFacturacionEnum;
export type CicloFacturacion =
  (typeof CICLOS_FACTURACION)[keyof typeof CICLOS_FACTURACION];

export const ESTADOS_LICENCIA = EstadoSuscripcionEnum;
export type EstadoLicencia =
  (typeof ESTADOS_LICENCIA)[keyof typeof ESTADOS_LICENCIA];

/** Fields returned by LicenciaSimpleResponse. */
export interface Licencia {
  id: string;
  codigo: string;
  plan: PlanLicencia;
  ciclo: CicloFacturacion;
  estado: EstadoLicencia;
  fecha_inicio: string;
  fecha_expiracion: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  empresa_id: string | null;
  created_at: string;
  updated_at: string;
  revocada_at: string | null;
}

/** Request body matching LicenciaCreate. */
export interface LicenciaCreate extends Omit<
  Licencia,
  "id" | "created_at" | "updated_at" | "revocada_at"
> {}

/** Request body matching LicenciaUpdate. */
export interface LicenciaUpdate {
  plan?: PlanLicencia | null;
  ciclo?: CicloFacturacion | null;
  estado?: EstadoLicencia | null;
  fecha_inicio?: string | null;
  fecha_expiracion?: string | null;
}

/** Request body matching LicenciaEmitirRequest. */
export interface EmitirLicencia {
  plan: PlanLicencia;
  ciclo: CicloFacturacion;
  fecha_inicio?: string;
  fecha_expiracion: string;
}

export interface LicenciaResponse extends Licencia {
  empresa?: Empresa | null;
}
