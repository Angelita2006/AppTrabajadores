import { EstadoTrabajadorEnum } from "../../../constants/enums";
import { AsignacionTurno } from "../../asignaciones-turno/types/asignacion-turno";
import { Contrato } from "../../contratos/types/contrato";
import { Empresa } from "../../empresas/types/empresa";

export const ESTADOS_TRABAJADOR = EstadoTrabajadorEnum;
export type Estado = (typeof ESTADOS_TRABAJADOR)[keyof typeof ESTADOS_TRABAJADOR];

/** Request body matching TrabajadorCreate. */
export interface TrabajadorCreate {
  empresa_id: string;
  usuario_id?: string | null;
  email?: string | null;
  telefono?: string | null;
  password?: string | null;
  dni_nif_nie: string;
  nombre: string;
  apellidos: string;
  numero_seguridad_social?: string | null;
  fecha_nacimiento?: string | null;
  foto_url?: string | null;
  activo?: boolean | null;
  estado: Estado;
  fecha_alta_empresa: string;
  fecha_baja_empresa?: string | null;
}

/** Request body matching TrabajadorUpdate. */
export interface TrabajadorUpdate {
  usuario_id?: string | null;
  dni_nif_nie?: string | null;
  nombre?: string | null;
  apellidos?: string | null;
  numero_seguridad_social?: string | null;
  fecha_nacimiento?: string | null;
  foto_url?: string | null;
  activo?: boolean | null;
  estado?: Estado | null;
  fecha_alta_empresa?: string | null;
  fecha_baja_empresa?: string | null;
}

/** Request body matching TrabajadorAutogestionUpdate. */
export interface TrabajadorAutogestionUpdate {
  nombre?: string | null;
  apellidos?: string | null;
  fecha_nacimiento?: string | null;
  foto_url?: string | null;
}

export interface ActualizarEstadoRequest {
  estado: Estado;
}

/** Fields returned by TrabajadorSimpleResponse. */
export interface TrabajadorSimpleResponse {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  dni_nif_nie: string;
  nombre: string;
  apellidos: string;
  numero_seguridad_social: string | null;
  fecha_nacimiento: string | null;
  foto_url: string | null;
  activo: boolean | null;
  estado: Estado;
  fecha_alta_empresa: string;
  fecha_baja_empresa: string | null;
  created_at: string;
  updated_at: string;
}

/** Response matching TrabajadorResponse, including the optional nested company. */
export interface TrabajadorResponse extends TrabajadorSimpleResponse {
  empresa?: Empresa | null;
  usuario?: { id: string; nombre: string; email: string; telefono: string | null; foto_url: string | null; activo: boolean | null } | null;
}

/** Screen model with locally assembled schedule and contact information. */
export interface Trabajador extends TrabajadorResponse {
  email?: string | null;
  telefono?: string | null;
  contratos?: Contrato[];
  contratoActivo?: Contrato | null;
  turnoAsignadoVigente?: AsignacionTurno | null;
  turnosAsignadosVigentes?: AsignacionTurno[] | null;
}

export interface TrabajadorPlantilla extends Trabajador {
  contratoActivo: Contrato | null;
  turnoAsignadoVigente: AsignacionTurno | null;
}

export interface AsignarTurnosRequest {
  turnos: string[];
}

export interface TrabajadorItem extends Trabajador {
  estado: Estado;
  contratoActivo: Contrato | null;
  turnosAsignadosVigentes: AsignacionTurno[] | null;
}

export interface FichaTrabajadorProps {
  item: Trabajador;
  onSeleccionarTrabajador: () => void;
  setModalActivo: (modal: string) => void;
  abrirEdicionContrato: (trabajador: Trabajador) => void;
  prepararAsignarTurno: (trabajador: Trabajador) => void;
  handleAsignarTurnoTrabajador: () => void;
  styles: Record<string, any>;
}
