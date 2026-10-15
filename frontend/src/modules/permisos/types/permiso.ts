import { AccionPermisoEnum, AlcancePermisoEnum, TipoPermisoEnum } from "../../../constants/enums";

export const TIPOS_PERMISO = TipoPermisoEnum;
export type TipoPermiso = (typeof TIPOS_PERMISO)[keyof typeof TIPOS_PERMISO];

export const ACCIONES_PERMISO = AccionPermisoEnum;
export type AccionPermiso = (typeof ACCIONES_PERMISO)[keyof typeof ACCIONES_PERMISO];

export const ALCANCES_PERMISO = AlcancePermisoEnum;
export type AlcancePermiso = (typeof ALCANCES_PERMISO)[keyof typeof ALCANCES_PERMISO];

export interface PermisoBase {
  tipo: TipoPermiso;
  accion: AccionPermiso;
  alcance: AlcancePermiso;
  descripcion: string;
}

/** Create payload matching PermisoCreate. */
export type PermisoCreate = PermisoBase;

/** Response matching PermisoSimpleResponse. */
export interface Permiso extends PermisoBase {
  id: string;
  created_at: string;
  updated_at: string;
}

export type PermisoSimpleResponse = Permiso;
