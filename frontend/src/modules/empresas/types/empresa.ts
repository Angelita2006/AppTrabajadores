import { Trabajador } from "../../trabajadores/types/trabajador";
import { UsuarioSesion } from "../../usuarios/types/usuario";

/**
 * Representa el modelo de una Empresa cliente (Tenant) en el frontend,
 * sincronizado exactamente con el esquema de respuesta del backend (EmpresaResponse).
 */
export interface Empresa {
  /** Identificador UUID único de la empresa. */
  id: string;
  /** Indicador booleano que determina si la empresa se encuentra activa en el sistema. */
  activa: boolean;
  /** Indicador booleano que determina si la organización creada actúa como gestoría matriz. */
  es_gestoria: boolean;
  /** Razón social oficial y legal de la empresa. */
  razon_social: string;
  /** Código de Identificación Fiscal (CIF) de la empresa. */
  cif: string;
  /** Zona horaria configurada para la organización (ej. Europe/Madrid). */
  zona_horaria: string;
  /** Objeto de configuración general con parámetros personalizados del tenant. */
  configuracion: Record<string, any>;
  /** Nombre comercial de la empresa. */
  nombre_comercial: string;
  /** Código Nacional de Actividad Económica (CNAE). */
  codigo_cnae: string | null;
  /** Convenio colectivo aplicable a la organización. */
  convenio_colectivo: string | null;
  /** Dirección fiscal completa de la empresa. */
  direccion_fiscal: string | null;
  /** URL o ruta del logo corporativo de la empresa, si aplica. */
  logo_url?: string | null;
  /** Fecha en la que se dio de alta la empresa en formato "AAAA-MM-DD". */
  fecha_alta: string;
  /** Fecha en la que se dio de baja la empresa en formato "AAAA-MM-DD", si aplica. */
  fecha_baja?: string | null;
  /** Marca de tiempo de creación del registro en formato ISO 8601. */
  created_at: string;
  /** Marca de tiempo de la última actualización del registro en formato ISO 8601. */
  updated_at: string;
  /** Listado de identificadores de trabajadores vinculados a la empresa. */
  trabajadores: string[];
}

/**
 * Esquema para la actualización parcial de los datos de una empresa,
 * sincronizado con el modelo `EmpresaUpdate`.
 */
export interface EmpresaUpdate {
  /** Nueva razón social a actualizar. */
  razon_social: string;
  /** Nuevo CIF a actualizar, si aplica. */
  cif: string;
  /** Nueva zona horaria a configurar. */
  zona_horaria: string;
  /** Nuevos parámetros de configuración personalizados, si aplica. */
  configuracion?: Record<string, any> | null;
  /** Nuevo estado de activación de la empresa. */
  activo: boolean;
  /** Nuevo indicador de gestoría. */
  es_gestoria?: boolean;
  /** Nuevo nombre comercial a actualizar. */
  nombre_comercial: string;
  /** Nuevo código CNAE a actualizar. */
  codigo_cnae: string;
  /** Nuevo convenio colectivo a actualizar. */
  convenio_colectivo: string;
  /** Nueva dirección fiscal a actualizar. */
  direccion_fiscal: string;
  /** Nueva URL o ruta del logo corporativo, si aplica. */
  logo_url?: string | null;
  /** Nueva fecha de baja en formato "AAAA-MM-DD", si aplica. */
  fecha_baja?: string | null;
}

/**
 * Esquema de transferencia de datos (DTO) para el registro inicial de una nueva organización (Tenant) y su administrador.
 * Sincronizado con el backend para el alta completa de empresa, primer trabajador y usuario administrador.
 */
export interface RegistroOrganizacionDTO {
  /** Código de licencia de activación corporativa. */
  codigo_licencia: string;
  /** Nombre comercial o marca de la nueva organización. */
  nombre_comercial: string;
  /** Código de Identificación Fiscal (CIF) de la organización. */
  cif: string;
  /** Razón social oficial de la organización. */
  razon_social: string;
  /** Código Nacional de Actividades Económicas (CNAE) de la empresa. */
  codigo_cnae: string;
  /** Convenio colectivo aplicable a la organización. */
  convenio_colectivo: string;
  /** Dirección fiscal o postal completa de la organización. */
  direccion_fiscal: string;
  /** Indica si la organización a registrar opera como una gestoría. */
  es_gestoria?: boolean;
  /** Nombre del usuario administrador inicial. */
  nombre_admin: string;
  /** Apellidos del usuario administrador inicial. */
  apellidos_admin: string;
  /** Número de identificación fiscal o documento de identidad (DNI/NIF/NIE) del administrador. */
  dni_nif_nie_admin: string;
  /** Teléfono de contacto del administrador. */
  telefono_admin: string;
  /** Correo electrónico principal de contacto o acceso del administrador. */
  email_admin: string;
  /** Número de la Seguridad Social (NSS) del administrador. */
  nss_admin: string;
  /** Fecha de nacimiento del administrador en formato estándar "AAAA-MM-DD". */
  fecha_nacimiento_admin: string;
  /** Contraseña en texto plano para el alta inicial del usuario administrador. */
  password_raw: string;
  /** URL o ruta del logo corporativo para el registro inicial, o nula si no aplica. */
  logo_url?: string | null;
}

/**
 * Representa la estructura de respuesta completa tras llevar a cabo el registro exitoso de una organización.
 */
export interface RespuestaRegistroCompleto {
  /** Datos de la empresa (tenant) recién creada. */
  empresa: Empresa;
  /** Datos del perfil de trabajador asociado al administrador inicial. */
  trabajador: Trabajador;
  /** Datos de la sesión de usuario generada para el acceso al sistema. */
  usuario: UsuarioSesion;
}
