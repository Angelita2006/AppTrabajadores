import { AsignacionTurno } from "../../asignaciones-turno/types/asignacion-turno";
import { Contrato } from "../../contratos/types/contrato";
import { TipoUsuarioEnum } from "../../usuarios/types/usuario";

export enum Estado {
  Inactivo = 0,
  Activo = 1,
  Trabajando = 2,
  Descansando = 3,
  HorasExtra = 4,
  Vacaciones = 5,
  Baja = 6,
}

/**
 * Interfaz oficial del Expediente Laboral (Tabla: trabajadores)
 * Mapeada exactamente con el modelo SQLAlchemy y Pydantic de la API.
 */
export interface Trabajador {
  id: string; // Identificador UUID único (gen_random_uuid)
  empresa_id: string; // Tenant de aislamiento multiempresa
  nif_nie: string; // Identificación Fiscal oficial (Máx 15 chars)
  nombre: string; // Nombre de pila del empleado
  apellidos: string; // Apellidos del empleado
  activo: boolean; // Estado operativo (true por defecto)
  fecha_alta_empresa: string; // Fecha formal de contratación ("AAAA-MM-DD")
  created_at: string; // Marca de tiempo de inserción real (ISO DateTime)
  updated_at: string; // Marca de tiempo de última modificación (ISO DateTime)
  email?: string | null; // Correo electrónico de contacto
  telefono?: string | null; // Teléfono de contacto
  numero_seguridad_social?: string | null; // Número de la Seguridad Social
  fecha_nacimiento?: string | null; // Fecha de nacimiento ("AAAA-MM-DD")
  fecha_baja_empresa?: string | null; // Fecha de baja laboral si aplica ("AAAA-MM-DD")
}

/**
 * Esquema para la creación/registro de un trabajador (POST /api/trabajadores)
 */
export interface TrabajadorCreate {
  empresa_id: string;
  nif_nie: string;
  nombre: string;
  apellidos: string;
  email?: string | null;
  telefono?: string | null;
  numero_seguridad_social?: string | null;
  fecha_nacimiento?: string | null;
}

/**
 * Esquema para la actualización parcial de un trabajador (PATCH /api/trabajadores/{id})
 */
export interface TrabajadorUpdate {
  empresa_id?: string;
  nif_nie?: string;
  nombre?: string;
  apellidos?: string;
  activo?: boolean;
  email?: string | null;
  telefono?: string | null;
  numero_seguridad_social?: string | null;
  fecha_nacimiento?: string | null;
  fecha_baja_empresa?: string | null;
}

/**
 * Interfaz para la solicitud de asignación masiva de turnos a un trabajador (POST /api/trabajadores/{id}/turnos)
 */
export interface AsignarTurnosRequest {
  turnos: string[]; // Lista de UUIDs de turnos a asignar
}

/**
 * Interfaz oficial de la Cuenta de Acceso (Tabla: usuarios)
 * Este es el objeto raíz que inyecta el backend tras el inicio de sesión exitoso.
 */
export interface UsuarioSesion {
  id: string; // UUID de la cuenta de usuario
  nombre: string;
  email: string;
  tipo_usuario: TipoUsuarioEnum;
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
