import { Empresa } from "../../empresas/types/empresa";
import { Rol } from "../../roles/types/rol";
import { UsuarioResponse } from "../../usuarios/types/usuario";

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
 * Diccionario de etiquetas descriptivas y textos de ayuda para cada tipo de usuario,
 * tipado dinámicamente en función del type `TipoUsuarioEnum`.
 */
export const TIPO_USUARIO_LABELS: Record<
  TipoUsuarioEnum,
  { label: string; descripcion: string }
> = {
  [TIPOS_USUARIO.ADMIN_GESTORIA]: {
    label: "Administrador de Gestoría",
    descripcion: "Control global multiempresa y supervisión de asesoría.",
  },
  [TIPOS_USUARIO.ADMIN_EMPRESA]: {
    label: "Administrador de Empresa",
    descripcion: "Gestión total de los datos de la empresa.",
  },
  [TIPOS_USUARIO.RRHH]: {
    label: "Recursos Humanos",
    descripcion:
      "Gestión de turnos, calendarios, incidencias, ausencias y personal.",
  },
  [TIPOS_USUARIO.REPRESENTANTE_LEGAL]: {
    label: "Representante Legal",
    descripcion: "Acceso a informes de cumplimiento y auditoría legal.",
  },
  [TIPOS_USUARIO.TRABAJADOR]: {
    label: "Trabajador",
    descripcion: "Realización de fichajes y consulta de cuadrante personal.",
  },
  [TIPOS_USUARIO.AUDITOR_ITSS]: {
    label: "Auditor ITSS",
    descripcion: "Acceso de inspección de trabajo a registros de jornada.",
  },
};

/**
 * Relación entre un usuario y un rol asignado en el sistema.
 */
export interface UsuarioRol {
  /** Identificador único de la asignación (UUID). */
  id: string;
  /** Identificador único del usuario (UUID). */
  usuario_id: string;
  /** Identificador único del rol (UUID). */
  rol_id: string;
  /** Identificador de la empresa (UUID) o null si el rol es global de gestoría. */
  empresa_id?: string | null;

  /** Detalles de la empresa asociada. */
  empresa?: Empresa | null;
  /** Detalles del usuario asociado. */
  usuario?: UsuarioResponse | null;
  /** Detalles del rol asociado. */
  rol?: Rol | null;
}

/**
 * Interface para asignar un rol a un usuario (creación).
 */
export interface UsuarioRolCreate {
  /** Identificador único del usuario (UUID). */
  usuario_id: string;
  /** Identificador único del rol (UUID). */
  rol_id: string;
  /** Identificador de la empresa (UUID) o null si el rol es global de gestoría. */
  empresa_id?: string | null;
}
