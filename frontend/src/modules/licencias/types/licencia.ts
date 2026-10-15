export type PlanLicencia = "Básico" | "Pro" | "Enterprise";
export type CicloFacturacion = "Trial" | "Mensual" | "Anual";
export type EstadoLicencia = "Trialing" | "Activa" | "Vencida" | "Cancelada";

export interface Licencia {
  id: string;
  codigo: string;
  empresa_id: string | null;
  plan: PlanLicencia;
  ciclo: CicloFacturacion;
  estado: EstadoLicencia;
  fecha_inicio: string;
  fecha_expiracion: string;
  created_at: string;
  updated_at: string;
  revocada_at: string | null;
}

export interface EmitirLicencia {
  plan: PlanLicencia;
  ciclo: CicloFacturacion;
  fecha_inicio: string;
  fecha_expiracion: string;
}
