import { Empresa } from "../../empresas/types/empresa";
import { RolSimpleResponse } from "../../roles/types/rol";
import { UsuarioSimpleResponse } from "../../usuarios/types/usuario";

export interface UsuarioEmpresaCreate {
  usuario_id: string;
  empresa_id?: string | null;
  rol_id: string;
  activo?: boolean | null;
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
  usuario?: UsuarioSimpleResponse | null;
  empresa?: Empresa | null;
  rol?: RolSimpleResponse | null;
}

