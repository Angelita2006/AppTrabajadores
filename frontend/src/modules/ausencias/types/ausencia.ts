import { Empresa } from "../../empresas/types/empresa";
import { Trabajador } from "../../trabajadores/types/trabajador";
import { UsuarioResponse } from "../../usuarios/types/usuario";

/**
 * Listado estático de los tipos de ausencias laborales soportados por el backend.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const TIPOS_AUSENCIA = {
  VACACIONES: "Vacaciones",
  BAJA_TEMPORAL: "Baja_temporal",
  MATERNIDAD_PATERNIDAD: "Maternidad_paternidad",
  PERMISO_RETRIBUIDO: "Permiso_retribuido",
  AUSENCIA_INJUSTIFICADA: "Ausencia_injustificada",
} as const;

/**
 * Diccionario de etiquetas legibles para los tipos de ausencia.
 */
export const TIPOS_AUSENCIA_LABELS: Record<TipoAusencia, string> = {
  [TIPOS_AUSENCIA.VACACIONES]: "Vacaciones",
  [TIPOS_AUSENCIA.BAJA_TEMPORAL]: "Baja Temporal",
  [TIPOS_AUSENCIA.MATERNIDAD_PATERNIDAD]: "Maternidad / Paternidad",
  [TIPOS_AUSENCIA.PERMISO_RETRIBUIDO]: "Permiso Retribuido",
  [TIPOS_AUSENCIA.AUSENCIA_INJUSTIFICADA]: "Ausencia Injustificada",
};

/**
 * Tipo de unión que define los tipos disponibles de ausencias laborales registrables en el sistema.
 */
export type TipoAusencia = (typeof TIPOS_AUSENCIA)[keyof typeof TIPOS_AUSENCIA];

/**
 * Listado estático de los estados posibles en el ciclo de vida de una ausencia.
 */
export const ESTADOS_AUSENCIA = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
} as const;

/**
 * Tipo de unión que representa los estados posibles del ciclo de vida de una solicitud de ausencia.
 */
export type EstadoAusencia =
  (typeof ESTADOS_AUSENCIA)[keyof typeof ESTADOS_AUSENCIA];

/**
 * Interface para el payload de envío (POST /api/ausencias).
 * Replica exactamente el esquema 'AusenciaCreate' de FastAPI.
 */
export interface AusenciaCreateRequest {
  /** Identificador único de la empresa (UUID). */
  empresa_id: string;
  /** Identificador único del trabajador (UUID). */
  trabajador_id: string;
  /** Tipo de ausencia solicitada. */
  tipo_ausencia: TipoAusencia;
  /** Fecha de inicio de la ausencia en formato AAAA-MM-DD. */
  fecha_inicio: string;
  /** Fecha de fin de la ausencia en formato AAAA-MM-DD. */
  fecha_fin: string;
  /** Motivo o justificación de la ausencia. */
  motivo: string;
  /** Metadatos opcionales adjuntos al justificante. */
  justificante_metadata?: Record<string, any>;
}

/**
 * Interface para el objeto completo devuelto por el servidor.
 * Replica el esquema 'AusenciaResponse' y el modelo SQLAlchemy 'Ausencias'.
 */
export interface AusenciaResponse {
  /** Identificador único de la ausencia (UUID). */
  id: string;
  /** Identificador único de la empresa (UUID). */
  empresa_id: string;
  /** Identificador único del trabajador (UUID). */
  trabajador_id: string;
  /** Tipo de ausencia registrada. */
  tipo_ausencia: TipoAusencia;
  /** Estado actual de la solicitud. */
  estado: EstadoAusencia;
  /** Fecha de inicio en formato AAAA-MM-DD. */
  fecha_inicio: string;
  /** Fecha de fin en formato AAAA-MM-DD. */
  fecha_fin: string;
  /** Motivo o justificación de la ausencia. */
  motivo: string;
  /** Metadatos del justificante o null si no existe. */
  justificante_metadata: Record<string, any> | null;
  /** Timestamp fecha y hora de creación del registro. */
  created_at: string;
  /** Timestamp fecha y hora de última actualización. */
  updated_at: string;

  /** Identificador del usuario de RRHH que validó la solicitud (UUID). */
  validado_por_usuario_id: string;
  /** Timestamp fecha y hora de resolución o null si todavía está pendiente. */
  fecha_resolucion?: string | null;
  /** Observaciones añadidas por el administrador (opcional). */
  observaciones_admin?: string | null;

  /** Relación opcional enriquecida para cargas anidadas del trabajador vinculado. */
  trabajador?: Trabajador | null;
  /** Relación opcional enriquecida para cargas anidadas de la empresa vinculada. */
  empresa?: Empresa | null;
  /** Detalles del usuario que validó la ausencia. */
  validado_por_usuario?: UsuarioResponse | null;
}

/**
 * Interface ligera optimizada para listados e items rápidos en tablas o tarjetas.
 */
export interface ItemAusencia {
  /** Identificador único de la ausencia (UUID). */
  id: string;
  /** Identificador único del trabajador (UUID). */
  trabajador_id: string;
  /** Tipo de ausencia. */
  tipo_ausencia: TipoAusencia;
  /** Estado de aprobación de la ausencia. */
  estado: EstadoAusencia;
  /** Fecha de inicio. */
  fecha_inicio: string;
  /** Fecha de fin. */
  fecha_fin: string;
  /** Motivo breve o null si carece de él. */
  motivo: string | null;

  /** Relación opcional enriquecida para cargas anidadas del trabajador vinculado. */
  trabajador?: Trabajador | null;
  /** Relación opcional enriquecida para cargas anidadas de la empresa vinculada. */
  empresa?: Empresa | null;
  /** Detalles del usuario que validó la ausencia. */
  validado_por_usuario?: UsuarioResponse | null;
}
