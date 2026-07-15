import { AsignacionTurno } from "../../asignaciones-turno/types/asignacion-turno";
import { Contrato } from "../../contratos/types/contrato";

export enum Estado {
  Inactivo = 0,
  Activo = 1,
  Trabajando = 2,
  Descansando = 3,
  HorasExtra = 4,
  Vacaciones = 5,
  Baja = 6,
}

// Roles de control de acceso definidos por el RBAC del servidor
export type TipoUsuario = "Admin_gestoría" | "Admin_empresa" | "Trabajador";

/**
 * Interfaz oficial del Expediente Laboral (Tabla: trabajadores)
 */
export interface Trabajador {
  id: string; // Identificador UUID único
  empresa_id: string; // Tenant de aislamiento multiempresa
  nif_nie: string; // Identificación Fiscal oficial
  nombre: string;
  apellidos: string;
  activo: boolean;
  fecha_alta_empresa: string; // Formato AAAA-MM-DD
  email?: string | null;
  telefono?: string | null;
  numero_seguridad_social?: string | null;
  fecha_nacimiento?: string | null;
  fecha_baja_empresa?: string | null;
}

/**
 * Interfaz oficial de la Cuenta de Acceso (Tabla: usuarios)
 * Este es el objeto raíz que inyecta el backend tras el inicio de sesión exitoso.
 */
export interface UsuarioSesion {
  id: string; // UUID de la cuenta de usuario
  nombre: string;
  email: string;
  tipo_usuario: TipoUsuario;
  mfa_habilitado: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
  ultimo_acceso?: string | null;
  empresa_id: string | null; // NULL para personal global de la gestoría
  trabajador_id: string | null; // NULL si es un usuario administrador puro sin expediente
}

export interface TrabajadorPlantilla extends Trabajador {
  contratoActivo: Contrato | null;
  turnoAsignadoVigente: AsignacionTurno | null;
}
