import { Empresa } from "../../empresas/types/empresa";
import { Trabajador } from "../../trabajadores/types/trabajador";
import { TipoRolEnum } from "../../../constants/enums";

/**
 * Listado estÃ¡tico de los tipos de perfiles de usuario permitidos dentro de la aplicaciÃ³n.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automÃ¡ticamente.
 */
export const TIPOS_USUARIO = TipoRolEnum;

/**
 * Tipo de uniÃ³n que representa los perfiles de usuario permitidos dentro de la aplicaciÃ³n.
 */
export type TipoUsuarioEnum =
  (typeof TIPOS_USUARIO)[keyof typeof TIPOS_USUARIO];

/**
 * Interface para la creaciÃ³n de un usuario 'UsuarioCreate'.
 */
/** Payload alineado con UsuarioCreate del backend. */
export interface UsuarioCreate {
  nombre: string;
  email: string;
  telefono?: string | null;
  foto_url?: string | null;
  password: string;
  activo?: boolean | null;
}

/** Request parcial alineado con UsuarioUpdate del backend. */
export interface UsuarioUpdate {
  nombre?: string | null;
  email?: string | null;
  telefono?: string | null;
  password?: string | null;
  activo?: boolean | null;
}

/** Login payload aligned with schemas.auth.LoginRequest. */
export interface LoginRequest {
  email?: string | null;
  telefono?: string | null;
  password: string;
}

/** Request body consumed by PUT /usuarios/solicitar-cambio-password. */
export interface PasswordCambioRequest {
  antigua_password: string;
}

/** Request body consumed by POST /usuarios/confirmar-cambio-password. */
export interface ConfirmarPasswordRecuperacionRequest {
  email?: string | null;
  telefono?: string | null;
  codigo_verificacion: string;
  nueva_password: string;
}

/** Effective company membership and permissions returned by /usuarios/me/accesos. */
export interface AccesoUsuario {
  membresia_id: string;
  empresa_id: string | null;
  rol: { id: string; nombre: string; tipo: string };
  permisos: Array<{ recurso: string; accion: string; alcance: string }>;
}

/**
 * Interface para el registro de usuarios (POST /api/usuarios/registro) 'UsuarioRegisterCreate'.
 */
/**
 * Interface que representa la respuesta del objeto Usuario completo 'UsuarioResponse'.
 */
/** Response matching UsuarioSimpleResponse from the backend. */
export interface UsuarioSimpleResponse {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  foto_url: string | null;
  activo: boolean | null;
  created_at: string;
  updated_at: string;
  ultimo_acceso: string | null;
}

/** Alias compatible con los consumidores existentes de respuestas de usuario. */
export type UsuarioResponse = UsuarioSimpleResponse;

/**
 * Interface para la respuesta de inicio de sesiÃ³n (LoginResponse).
 * Devuelve el token JWT y la entidad de usuario asociada.
 */
export interface LoginResponse {
  /** Token de acceso JWT generado por el servidor. */
  access_token: string;
  /** Tipo de token (por lo general "bearer"). */
  token_type: string;
  /** Entidad de usuario asociada a la sesiÃ³n. */
  usuario: UsuarioSimpleResponse;
}

/**
 * Interfaz oficial de la Cuenta de Acceso (Tabla: usuarios).
 * Este es el objeto raÃ­z que inyecta el backend tras el inicio de sesiÃ³n exitoso.
 */
export interface UsuarioSesion {
  /** Identificador Ãºnico universal (UUID) de la cuenta de usuario. */
  id: string;
  /** ID de la ficha laboral de la empresa activa; enriquecido en cliente. */
  trabajador_id?: string | null;
  /** Identificador de la empresa asociada (UUID). */
  empresa_id?: string | null;
  /** Nombre completo del usuario. */
  nombre: string;
  /** Correo electrÃ³nico de acceso. */
  email: string;
  /** Tipo (rol) de usuario asignado. */
  tipo_usuario?: TipoUsuarioEnum;
  /** Indica si la autenticaciÃ³n multifactor (MFA) se encuentra habilitada. */
  mfa_habilitado?: boolean;
  /** Indica si la cuenta de usuario estÃ¡ activa. */
  activo: boolean | null;
  telefono?: string | null;
  /** Timestamp de la fecha y hora del Ãºltimo acceso del usuario o null si no ha accedido. */
  ultimo_acceso?: string | null;
  /** Timestamp de la fecha y hora de creaciÃ³n de la cuenta. */
  created_at: string;
  /** Timestamp de la fecha y hora de la Ãºltima modificaciÃ³n de la cuenta. */
  updated_at: string;
  /** Ruta privada del avatar propio, independiente de las fotos laborales. */
  foto_url?: string | null;

  /** RelaciÃ³n opcional de la empresa vinculada a la sesiÃ³n. */
  empresa?: Empresa | null;
  /** RelaciÃ³n opcional del trabajador vinculado a la sesiÃ³n. */
  trabajador?: Trabajador | null;
}

/**
 * Interface para listados en paneles de administraciÃ³n o tablas de usuarios.
 */
export interface ItemUsuario {
  /** Identificador Ãºnico del usuario (UUID). */
  id: string;
  /** Nombre completo. */
  nombre: string;
  /** Correo electrÃ³nico. */
  email: string;
  /** Tipo (rol) de usuario. */
  tipo_usuario: TipoUsuarioEnum;
  /** Indica si la cuenta se encuentra activa. */
  activo: boolean;
  /** Timestamp fecha y hora del Ãºltimo acceso o null si todavÃ­a no ha accedido. */
  ultimo_acceso: string | null;

  /** RelaciÃ³n opcional de la empresa vinculada a la sesiÃ³n. */
  empresa?: Empresa | null;
  /** RelaciÃ³n opcional del trabajador vinculado a la sesiÃ³n. */
  trabajador?: Trabajador | null;
}
