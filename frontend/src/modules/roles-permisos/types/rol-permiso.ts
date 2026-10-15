import { Permiso } from "../../permisos/types/permiso";
import { Rol } from "../../roles/types/rol";

export interface RolPermisoCreate { rol_id: string; permiso_id: string }
export interface RolPermisoSimpleResponse {
  id: string;
  rol_id: string;
  permiso_id: string;
  created_at: string;
  updated_at: string;
}
export interface RolPermisoResponse extends RolPermisoSimpleResponse {
  rol: Rol | null;
  permiso: Permiso | null;
}

