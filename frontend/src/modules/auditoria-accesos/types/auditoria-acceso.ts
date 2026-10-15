import { AccionAuditoriaEnum } from "../../../constants/enums";
import { Empresa } from "../../empresas/types/empresa";
import { Trabajador } from "../../trabajadores/types/trabajador";
import { UsuarioSesion } from "../../usuarios/types/usuario";

export type AccionAuditoria =
  | "Consulta" | "Creación" | "Modificación" | "Baja_lógica"
  | "Eliminación" | "Exportación" | "Importación" | "Descarga" | "Acceso_denegado";
export interface AuditoriaAccesoBase {
  accion: AccionAuditoria;
  fecha_hora: string;
  detalle: Record<string, unknown> | null;
  ip_address: string | null;
}
export interface AuditoriaAccesoCreate extends AuditoriaAccesoBase {
  empresa_id: string;
  usuario_id: string | null;
  trabajador_id: string | null;
}
export interface AuditoriaAccesoSimpleResponse extends AuditoriaAccesoBase {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  trabajador_id: string | null;
}
export interface AuditoriaAccesoResponse extends AuditoriaAccesoSimpleResponse {
  empresa: Empresa | null;
  usuario: UsuarioSesion | null;
  trabajador: Trabajador | null;
}

