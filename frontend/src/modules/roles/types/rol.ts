/**
 * Listado estático de los roles básicos disponibles en el sistema para la lógica de negocio y vistas.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const ROLES = {
  ADMIN_GESTORIA: "Admin_gestoría",
  ADMIN_EMPRESA: "Admin_empresa",
  RRHH: "Rrhh",
  REPRESENTANTE_LEGAL: "Representante_legal",
  TRABAJADOR: "Trabajador",
  AUDITOR_ITSS: "Auditor_itss",
} as const;

/**
 * Tipo de unión que representa los roles básicos disponibles en el sistema.
 */
export type RolEnum = (typeof ROLES)[keyof typeof ROLES];

/**
 * Representa la definición base y completa de un rol en la plataforma (Tabla: roles).
 */
export interface Rol {
  /** Identificador UUID único del rol. */
  id: string;
  /** Nombre descriptivo u oficial del rol en el sistema. */
  nombre: string;
  /** Descripción detallada de las funciones y permisos asociados al rol. */
  descripcion: string;
}

/**
 * Esquema para la creación o registro de un nuevo rol (POST /api/roles).
 */
export interface RolCreate {
  /** Nombre descriptivo u oficial del nuevo rol. */
  nombre: string;
  /** Descripción detallada de las funciones y permisos del nuevo rol. */
  descripcion: string;
}
