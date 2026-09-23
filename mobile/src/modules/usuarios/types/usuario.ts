import { Empresa } from "../../empresas/types/empresa";
import { Trabajador } from "../../trabajadores/types/trabajador";

/**
 * Listado estático de los tipos de perfiles de usuario permitidos dentro de la aplicación.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const TIPOS_USUARIO = {
  ADMIN_GESTORIA: "Admin_gestoría",
  ADMIN_EMPRESA: "Admin_empresa",
  RRHH: "Rrhh",
  REPRESENTANTE_LEGAL: "Representante_legal",
  TRABAJADOR: "Trabajador",
  AUDITOR_ITSS: "Auditor_itss",
} as const;

/**
 * Tipo de unión que representa los perfiles de usuario permitidos dentro de la aplicación.
 */
export type TipoUsuarioEnum =
  (typeof TIPOS_USUARIO)[keyof typeof TIPOS_USUARIO];

/**
 * Interface para la creación de un usuario 'UsuarioCreate'.
 */
export interface UsuarioCreateRequest {
  /** Nombre completo del usuario. */
  nombre: string;
  /** Correo electrónico único para el acceso. */
  email: string;
  /** Tipo (rol) del usuario. */
  tipo_usuario: TipoUsuarioEnum;
  /** Contraseña en texto plano para su posterior cifrado en servidor. */
  password_raw: string;
  /** Identificador de la empresa asociada (UUID). */
  empresa_id?: string | null;
  /** Identificador del trabajador asociado (UUID). */
  trabajador_id?: string | null;
}

/**
 * Interface para el registro de usuarios (POST /api/usuarios/registro) 'UsuarioRegisterCreate'.
 */
export interface UsuarioRegisterRequest {
  /** CIF de la empresa a la que se vincula. */
  empresa_cif: string;
  /** NIF o NIE del usuario. */
  dni_nif_nie: string;
  /** Correo electrónico de contacto. */
  email: string;
  /** Contraseña de acceso. */
  password: string;
}

/**
 * Interface para las credenciales de inicio de sesión (POST /api/usuarios/login) 'LoginRequest'.
 */
export interface LoginRequest {
  /** Correo electrónico registrado. */
  email: string;
  /** Contraseña de acceso. */
  password: string;
}

/**
 * Interface que representa la respuesta del objeto Usuario completo 'UsuarioResponse'.
 */
export interface UsuarioResponse {
  /** Identificador de la empresa asociada (UUID). */
  empresa_id?: string | null;
  /** Identificador del trabajador asociado (UUID). */
  trabajador_id?: string | null;
  /** Identificador único del usuario (UUID). */
  id: string;
  /** Nombre completo. */
  nombre: string;
  /** Correo electrónico. */
  email: string;
  /** Tipo de usuario asignado. */
  tipo_usuario: TipoUsuarioEnum;
  /** Indica si la autenticación multifactor (MFA) está habilitada. */
  mfa_habilitado: boolean;
  /** Indica si la cuenta se encuentra activa. */
  activo: boolean;
  /** Timestamp fecha y hora del registro. */
  created_at: string;
  /** Timestamp fecha y hora de última actualización. */
  updated_at: string;
  /** Timestamp fecha y hora del último acceso del usuario o null si todavía no ha accedido. */
  ultimo_acceso: string | null;

  /** Detalles opcionales de la empresa asociada. */
  empresa?: Empresa | null;
  /** Detalles opcionales del trabajador asociado. */
  trabajador?: Trabajador | null;
}

/**
 * Interface para la respuesta de inicio de sesión (LoginResponse).
 * Devuelve el token JWT y la entidad de usuario asociada.
 */
export interface LoginResponse {
  /** Token de acceso JWT generado por el servidor. */
  access_token: string;
  /** Tipo de token (por lo general "bearer"). */
  token_type: string;
  /** Entidad de usuario asociada a la sesión. */
  usuario: UsuarioResponse;
}

/**
 * Interfaz oficial de la Cuenta de Acceso (Tabla: usuarios).
 * Este es el objeto raíz que inyecta el backend tras el inicio de sesión exitoso.
 */
export interface UsuarioSesion {
  /** Identificador único universal (UUID) de la cuenta de usuario. */
  id: string;
  /** Identificador de la empresa asociada (UUID). */
  empresa_id?: string | null;
  /** Identificador del trabajador asociado (UUID). */
  trabajador_id?: string | null;
  /** Nombre completo del usuario. */
  nombre: string;
  /** Correo electrónico de acceso. */
  email: string;
  /** Tipo (rol) de usuario asignado. */
  tipo_usuario: TipoUsuarioEnum;
  /** Indica si la autenticación multifactor (MFA) se encuentra habilitada. */
  mfa_habilitado: boolean;
  /** Indica si la cuenta de usuario está activa. */
  activo: boolean;
  /** Timestamp de la fecha y hora del último acceso del usuario o null si no ha accedido. */
  ultimo_acceso?: string | null;
  /** Timestamp de la fecha y hora de creación de la cuenta. */
  created_at: string;
  /** Timestamp de la fecha y hora de la última modificación de la cuenta. */
  updated_at: string;

  /** Relación opcional de la empresa vinculada a la sesión. */
  empresa?: Empresa | null;
  /** Relación opcional del trabajador vinculado a la sesión. */
  trabajador?: Trabajador | null;
}

/**
 * Interface para listados en paneles de administración o tablas de usuarios.
 */
export interface ItemUsuario {
  /** Identificador único del usuario (UUID). */
  id: string;
  /** Nombre completo. */
  nombre: string;
  /** Correo electrónico. */
  email: string;
  /** Tipo (rol) de usuario. */
  tipo_usuario: TipoUsuarioEnum;
  /** Indica si la cuenta se encuentra activa. */
  activo: boolean;
  /** Timestamp fecha y hora del último acceso o null si todavía no ha accedido. */
  ultimo_acceso: string | null;

  /** Relación opcional de la empresa vinculada a la sesión. */
  empresa?: Empresa | null;
  /** Relación opcional del trabajador vinculado a la sesión. */
  trabajador?: Trabajador | null;
}
