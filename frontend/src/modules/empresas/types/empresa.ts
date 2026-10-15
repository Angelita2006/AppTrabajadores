import { UsuarioSesion } from "../../usuarios/types/usuario";

/** Fields returned by EmpresaSimpleResponse / EmpresaResponse. */
export interface Empresa {
  id: string;
  nombre_comercial: string;
  razon_social: string;
  cif: string;
  zona_horaria: string;
  activa: boolean | null;
  configuracion: Record<string, unknown> | null;
  es_gestoria: boolean | null;
  codigo_cnae: string | null;
  convenio_colectivo: string | null;
  direccion: string | null;
  fecha_baja: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Request body matching EmpresaCreate. */
export interface EmpresaCreate {
  nombre_comercial: string;
  razon_social: string;
  cif: string;
  zona_horaria?: string;
  activa?: boolean | null;
  configuracion?: Record<string, unknown> | null;
  es_gestoria?: boolean | null;
  codigo_cnae?: string | null;
  convenio_colectivo?: string | null;
  direccion?: string | null;
  fecha_baja?: string | null;
  logo_url?: string | null;
}

/** Request body matching EmpresaUpdate. */
export type EmpresaUpdate = Partial<EmpresaCreate>;

/** Request body matching RegistroOrganizacionCompleta. */
export interface RegistroOrganizacionDTO extends EmpresaCreate {
  zona_horaria: string;
  codigo_licencia: string;
  nombre_admin: string;
  email_admin: string;
  telefono_admin?: string | null;
  password: string;
}

/** Response body matching RespuestaRegistroCompletoDTO. */
export interface RespuestaRegistroCompleto {
  empresa: Empresa;
  usuario: UsuarioSesion;
}

/** Optional client-side fields; these are not part of EmpresaResponse. */
export interface EmpresaView extends Empresa {
  trabajadores?: string[];
}

/** Form-only fields used while collecting an administrator's details. */
export interface RegistroOrganizacionFormulario extends RegistroOrganizacionDTO {
  direccion_fiscal?: string;
  password_raw?: string;
  apellidos_admin?: string;
  dni_nif_nie_admin?: string;
  nss_admin?: string;
  fecha_nacimiento_admin?: string;
}
