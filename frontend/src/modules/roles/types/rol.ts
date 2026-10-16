import { Empresa } from "../../empresas/types/empresa";
import { TipoRolEnum } from "../../../constants/enums";

export const TIPOS_ROL = TipoRolEnum;
export type TipoRol = (typeof TIPOS_ROL)[keyof typeof TIPOS_ROL];

/** Legacy name retained for components; values come from TipoRolEnum. */
export const ROLES = TIPOS_ROL;
export type RolEnum = TipoRol;

export interface RolBase {
  nombre: string;
  descripcion?: string | null;
}

/** Request body matching RolCreate. */
export interface RolCreate extends RolBase {
  empresa_id: string | null;
  tipo?: TipoRol;
}

/** Request body matching RolUpdate. */
export interface RolUpdate {
  nombre?: string | null;
  descripcion?: string | null;
}

/** Response matching RolSimpleResponse. */
export interface RolSimpleResponse extends RolBase {
  descripcion: string | null;
  id: string;
  empresa_id: string | null;
  tipo: TipoRol;
  created_at: string;
  updated_at: string;
}

/** Response matching RolResponse. */
export interface Rol extends RolSimpleResponse {
  empresa?: Empresa | null;
}
