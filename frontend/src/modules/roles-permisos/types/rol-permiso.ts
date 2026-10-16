import { PermisoSimpleResponse } from "../../permisos/types/permiso";
import { RolSimpleResponse } from "../../roles/types/rol";

/** Payload que espera RolPermisoCreate en la API. */
export interface RolPermisoCreate {
  rol_id: string;
  permiso_id: string;
}

/** Respuesta simple de una asociación rol-permiso. */
export interface RolPermisoSimpleResponse {
  id: string;
  rol_id: string;
  permiso_id: string;
  created_at: string;
  updated_at: string;
}

/** Respuesta que incluye las relaciones anidadas opcionales. */
export interface RolPermisoResponse extends RolPermisoSimpleResponse {
  rol?: RolSimpleResponse | null;
  permiso?: PermisoSimpleResponse | null;
}
