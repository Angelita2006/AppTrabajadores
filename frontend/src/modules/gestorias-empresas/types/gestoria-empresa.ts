import { Empresa } from "../../empresas/types/empresa";
import { UsuarioSesion } from "../../usuarios/types/usuario";

export interface GestoriaEmpresaBase {
  fecha_inicio: string;
  fecha_fin: string | null;
}
export interface GestoriaEmpresaCreate extends GestoriaEmpresaBase {
  empresa_cliente_id: string;
}
export interface GestoriaEmpresaUpdate {
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  activo?: boolean | null;
}
export interface GestoriaEmpresaPermisosUpdate {
  permisos_delegados: string[];
}
export interface GestoriaEmpresaSimpleResponse extends GestoriaEmpresaBase {
  id: string;
  empresa_gestora_id: string;
  empresa_cliente_id: string;
  usuario_creador_id: string | null;
  permisos_delegados: string[];
  permisos_maximos: string[];
  created_at: string;
  updated_at: string;
}
export interface GestoriaEmpresaResponse extends GestoriaEmpresaSimpleResponse {
  empresa_gestora: Empresa | null;
  empresa_cliente: Empresa | null;
  usuario_creador: UsuarioSesion | null;
}

