// ==========================================
// ENUMS PARA USUARIOS Y ROLES (FRONTEND)
// Sincronizados con el backend de FastAPI y TipoUsuarioEnum
// ==========================================

export enum TipoUsuarioEnum {
  ADMIN_GESTORIA = "Admin_gestoría",
  ADMIN_EMPRESA = "Admin_empresa",
  RRHH = "Rrhh",
  REPRESENTANTE_LEGAL = "Representante_legal",
  TRABAJADOR = "Trabajador",
  AUDITOR_ITSS = "Auditor_itss",
}

/**
 * Interface para el payload de creación de un usuario (POST /api/usuarios)
 * Replica exactamente el esquema 'UsuarioCreate' de FastAPI
 */
export interface UsuarioCreateRequest {
  nombre: string;
  email: string;
  tipo_usuario: TipoUsuarioEnum;
  password_raw: string;
  empresa_id?: string | null; // UUID opcional
  trabajador_id?: string | null; // UUID opcional
}

/**
 * Interface para el registro rápido desde la app móvil (POST /api/usuarios/registro)
 * Replica el esquema 'UsuarioRegisterCreate' de FastAPI
 */
export interface UsuarioRegisterRequest {
  empresa_cif: string;
  nif_nie: string;
  email: string;
  password: string;
}

/**
 * Interface para las credenciales de inicio de sesión (POST /api/usuarios/login)
 * Replica el esquema 'LoginRequest' de FastAPI
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Interface que representa la respuesta del objeto Usuario completo
 * Replica el esquema 'UsuarioResponse' de FastAPI
 */
export interface UsuarioResponse {
  id: string; // UUID
  nombre: string;
  email: string;
  tipo_usuario: TipoUsuarioEnum;
  mfa_habilitado: boolean;
  activo: boolean;
  created_at: string; // Timestamp ISO
  updated_at: string; // Timestamp ISO
  empresa_id: string | null; // UUID o null
  trabajador_id: string | null; // UUID o null
  ultimo_acceso: string | null; // Timestamp ISO o null
  // access_token: string;
}

/**
 * Interface para la respuesta consolidada de inicio de sesión (LoginResponse)
 * Devuelve el token JWT y la entidad de usuario asociada
 */
export interface LoginResponse {
  access_token: string;
  token_type: string;
  usuario: UsuarioResponse;
}

/**
 * Interface ligera optimizada para listados rápidos en paneles de administración o tablas de usuarios.
 */
export interface ItemUsuario {
  id: string;
  nombre: string;
  email: string;
  tipo_usuario: TipoUsuarioEnum;
  activo: boolean;
  ultimo_acceso: string | null;
}
