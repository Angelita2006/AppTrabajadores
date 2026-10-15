import { Empresa } from "../../empresas/types/empresa";
import { Rol } from "../../roles/types/rol";
import { UsuarioSesion } from "../../usuarios/types/usuario";

export interface UsuarioEmpresaCreate {
  usuario_id: string;
  empresa_id: string | null;
  rol_id: string;
}
export interface UsuarioEmpresaUpdate {
  rol_id?: string | null;
  activo?: boolean | null;
}
export interface UsuarioEmpresaSimpleResponse {
  id: string;
  usuario_id: string;
  empresa_id: string | null;
  rol_id: string;
  activo: boolean | null;
  created_at: string;
  updated_at: string;
}
export interface UsuarioEmpresaResponse extends UsuarioEmpresaSimpleResponse {
  usuario: UsuarioSesion | null;
  empresa: Empresa | null;
  rol: Rol | null;
}

