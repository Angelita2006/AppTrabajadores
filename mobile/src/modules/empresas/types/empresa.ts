import { Trabajador, UsuarioSesion } from "../../trabajadores/types/trabajador";

/**
 * Representa el modelo de una Empresa cliente (Tenant) en el frontend,
 * sincronizado exactamente con el esquema de respuesta del backend (EmpresaResponse).
 */
export interface Empresa {
  // Identificadores y Estados del Sistema
  id: string;
  activa: boolean;

  // Información Fiscal y Comercial Obligatoria
  razon_social: string;
  cif: string;

  // Información de Configuración
  zona_horaria: string;
  configuracion: Record<string, any>;

  // Datos Fiscales y de Negocio Opcionales
  nombre_comercial?: string | null;
  codigo_cnae?: string | null;
  convenio_colectivo?: string | null;
  direccion_fiscal?: string | null;

  // Control de Fechas y Auditoría
  fecha_alta: string; // Formato "YYYY-MM-DD"
  fecha_baja?: string | null; // Formato "YYYY-MM-DD" (Sincronizado con SQLAlchemy/Pydantic)
  created_at: string; // ISO 8601 string
  updated_at: string; // ISO 8601 string

  // Relaciones opcionales según carga del backend
  trabajadores?: string[];
}

/**
 * Esquema para la actualización parcial de los datos de una empresa,
 * sincronizado con EmpresaUpdate de Pydantic.
 */
export interface EmpresaUpdate {
  razon_social?: string | null;
  cif?: string | null;
  zona_horaria?: string | null;
  configuracion?: Record<string, any> | null;
  activa?: boolean | null;
  nombre_comercial?: string | null;
  codigo_cnae?: string | null;
  convenio_colectivo?: string | null;
  direccion_fiscal?: string | null;
  fecha_baja?: string | null;
}

export interface RegistroOrganizacionDTO {
  nombre_comercial: string;
  cif: string;
  email: string;
  password_raw: string;
  razon_social?: string;
  nombre_admin?: string;
  apellidos_admin?: string;
}

export interface RespuestaRegistroCompleto {
  empresa: Empresa;
  trabajador: Trabajador;
  usuario: UsuarioSesion;
}
