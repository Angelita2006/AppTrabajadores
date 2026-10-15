export interface LoginRequest {
  email?: string | null;
  telefono?: string | null;
  password: string;
}
export interface EmailCambioRequest { email_nuevo: string }
export interface ConfirmarCambioEmail { token: string }
export interface TelefonoCambioRequest { telefono_nuevo: string }
export interface ConfirmarCambioTelefono { codigo: string }
export interface PasswordCambioRequest { antigua_password: string; nueva_password: string }
export interface PasswordRecuperacionRequest {
  email?: string | null;
  telefono?: string | null;
}
export interface ConfirmarPasswordRecuperacionRequest {
  email?: string | null;
  telefono?: string | null;
  codigo_verificacion: string;
  nueva_password: string;
}

