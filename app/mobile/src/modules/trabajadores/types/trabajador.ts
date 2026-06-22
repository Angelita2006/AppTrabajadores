export enum Estado {
  Inactivo,
  Activo,
  Trabajando,
  Descansando,
  HorasExtra,
  Vacaciones,
  Baja,
}

// Catálogo oficial de tipos de usuario reflejado en el backend Saas
export type TipoUsuario = "admin_gestoria" | "admin_empresa" | "trabajador";

/**
 * Representa el expediente laboral del empleado (Tabla: trabajadores)
 */
export interface Trabajador {
  id: string; // Cambiado a string para soportar UUID de producción
  empresa_id: string; // Enlace UUID obligatorio con su organización
  nif_nie: string; // Renombrado de 'dni' para coincidir con la base de datos
  nombre: string;
  apellidos: string;
  activo: boolean; // Estado de alta/baja legal según RGPD
  fecha_alta_empresa: string; // Formato de fecha AAAA-MM-DD

  // Campos opcionales del expediente de recursos humanos
  email?: string;
  telefono?: string;
  numero_seguridad_social?: string;
  fecha_nacimiento?: string;
  fecha_baja_empresa?: string | null;
}

/**
 * Representa la cuenta de acceso y sesión global de la app (Tabla: usuarios)
 * Este modelo unifica la cuenta e integra los datos del trabajador y la empresa activa.
 */
export interface UsuarioSesion {
  id: string; // Identificador UUID único de la cuenta de usuario
  nombre: string; // Nombre identificativo de la cuenta
  email: string; // Correo electrónico único de acceso
  tipo_usuario: TipoUsuario; // Rol técnico dentro del sistema Saas
  mfa_habilitado: boolean;
  activo: boolean; // Control de bloqueo de login
  created_at: string;
  updated_at: string;
  ultimo_acceso?: string | null;
  estado: Estado;

  empresa_id: string | null; // NULL para personal de gestoría, UUID para empleados acotados
  trabajador_id: string | null; // ID UUID del expediente laboral vinculado

  trabajador?: Trabajador | null;
}
