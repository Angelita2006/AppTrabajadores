/**
 * Listado estático de los códigos o slugs comunes de permisos para blindar componentes visuales y controlar accesos en el sistema.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const PERMISOS = {
  /** Permiso requerido para realizar el registro de fichajes laborales. */
  FICHAR: "fichajes.fichar",
  /** Permiso requerido para la creación y configuración de roles de seguridad. */
  CREAR_ROLES: "roles.crear",
  /** Permiso requerido para la visualización de registros de auditoría y cumplimiento. */
  VER_AUDITORIA: "auditoria.ver",
  /** Permiso requerido para la gestión y administración general de la empresa. */
  GESTIONAR_EMPRESA: "empresa.gestionar",
} as const;

/**
 * Tipo de unión que representa los códigos o slugs comunes de permisos en el sistema.
 */
export type PermisoEnum = (typeof PERMISOS)[keyof typeof PERMISOS];

/**
 * Representa la definición base y completa de un permiso en la plataforma (Tabla: permisos).
 */
export interface Permiso {
  /** Identificador UUID único del permiso. */
  id: string;
  /** Código o slug único que identifica el permiso en la lógica de control de acceso. */
  codigo: string;
  /** Descripción detallada de las acciones o recursos habilitados por el permiso. */
  descripcion: string;
}

/**
 * Esquema para la creación o registro de un nuevo permiso en el sistema (POST /api/permisos).
 */
export interface PermisoCreate {
  /** Código o slug único que identifica el nuevo permiso. */
  codigo: string;
  /** Descripción detallada opcional de las funciones asociadas al nuevo permiso. */
  descripcion: string | null;
}
