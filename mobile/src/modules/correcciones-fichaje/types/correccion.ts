import { Empresa } from "../../empresas/types/empresa";
import { RegistroFichaje } from "../../fichajes/types/registrofichaje";
import { TipoEventoFichaje } from "../../tipos_eventos_fichaje/types/tipos_evento_fichaje";
import { Trabajador } from "../../trabajadores/types/trabajador";
import { UsuarioResponse } from "../../usuarios/types/usuario";

/**
 * Listado estático de las categorías de corrección o ajuste permitidas para los fichajes,
 * sincronizadas exactamente con el esquema del backend.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const TIPOS_CORRECCION = {
  /** Alta manual de un registro horario. */
  ALTA_MANUAL: "Alta_manual",
  /** Modificación de un registro horario existente. */
  MODIFICACION: "Modificación",
  /** Anulación de un registro horario. */
  ANULACION: "Anulación",
} as const;

/**
 * Tipo de unión que representa las diferentes categorías de corrección o ajuste permitidas.
 */
export type TipoCorreccion =
  (typeof TIPOS_CORRECCION)[keyof typeof TIPOS_CORRECCION];

/**
 * Listado estático de los estados posibles en el flujo de aprobación de una incidencia o corrección,
 * sincronizadas exactamente con el esquema del backend.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const ESTADOS_CORRECCION = {
  /** La incidencia ha sido creada y está pendiente de revisión por parte de un administrador o supervisor. */
  PENDIENTE: "Pendiente",
  /** La incidencia ha sido evaluada y aprobada oficialmente en el sistema. */
  APROBADA: "Aprobada",
  /** La incidencia ha sido rechazada por el administrador o supervisor. */
  RECHAZADA: "Rechazada",
} as const;

/**
 * Tipo de unión que representa los estados posibles en el flujo de aprobación de una incidencia.
 */
export type EstadoCorreccion =
  (typeof ESTADOS_CORRECCION)[keyof typeof ESTADOS_CORRECCION];

/**
 * Propiedades comunes compartidas para la validación de una corrección de fichaje.
 * Sincronizado con 'CorreccionFichajeBase' de Pydantic.
 */
export interface CorreccionFichajeBase {
  /** ID único UUID de la empresa cliente (tenant). */
  empresa_id: string;
  /** ID único UUID del trabajador afectado. */
  trabajador_id: string;
  /** Tipo de rectificación horaria solicitada. */
  tipo_correccion: TipoCorreccion;
  /** ID único UUID del tipo de evento de fichaje correspondiente. */
  tipo_evento_id: string;
  /** ID del fichaje original que se desea corregir o anular. */
  fichaje_afectado_id?: string | null;
  /** Valores previos almacenados en formato JSON. */
  valor_anterior?: Record<string, any> | null;
  /** Nuevos valores propuestos en formato JSON. */
  valor_nuevo?: Record<string, any> | null;
  /** Justificación detallada de la solicitud de corrección. */
  motivo: string;
}

/**
 * Estructura de datos requerida para el registro o creación de una nueva incidencia o solicitud de corrección.
 * Sincronizado exactamente con el esquema 'CorreccionFichajeCreate' del backend.
 */
export interface CorreccionFichajeCreate extends CorreccionFichajeBase {
  /** ID del usuario que realiza la petición. */
  solicitado_por_usuario_id: string;
}

/**
 * Esquema para la actualización opcional de los datos de la corrección.
 * Sincronizado con 'CorreccionFichajeUpdate' de Pydantic.
 */
export interface CorreccionFichajeUpdate {
  tipo_correccion?: TipoCorreccion;
  valor_nuevo?: Record<string, any>;
  motivo?: string;
  estado?: EstadoCorreccion;
}

/**
 * Esquema base y simple utilizado para estructurar las respuestas JSON hacia la interfaz.
 * Sincronizado con 'CorreccionFichajeSimpleResponse' de Pydantic.
 */
export interface CorreccionFichajeSimpleResponse extends CorreccionFichajeBase {
  /** Identificador único UUID autogenerado de la corrección. */
  id: string;
  /** Estado actual de la solicitud. */
  estado: EstadoCorreccion;
  /** ID del usuario solicitante. */
  solicitado_por_usuario_id: string;
  /** ID del usuario que aprobó/resolvió la incidencia. */
  aprobado_por_usuario_id?: string | null;
  /** Fecha y hora de la solicitud en formato ISO DateTime. */
  fecha_solicitud: string;
  /** Fecha y hora de la resolución en formato ISO DateTime. */
  fecha_resolucion?: string | null;
}

/**
 * Representa la entidad completa devuelta por el servidor tras consultar o gestionar una incidencia,
 * incluyendo todas las relaciones anidadas solicitadas (empresa, trabajador, tipoevento, usuariosolicitor, fichajeafectado y ususarioresolutor).
 * Sincronizado con 'CorreccionFichajeResponse' de Pydantic.
 */
export interface CorreccionFichajeResponse extends CorreccionFichajeSimpleResponse {
  /** Campo enriquecido opcional para mostrar de forma amigable el nombre completo del trabajador en la interfaz. */
  trabajador_nombre_completo?: string;
  /** Detalles de la empresa asociada. */
  empresa?: Empresa | null;
  /** Detalles del trabajador afectado. */
  trabajador?: Trabajador | null;
  /** Detalles del tipo de evento asociado. */
  tipo_evento?: TipoEventoFichaje | null;
  /** Detalles del usuario solicitante. */
  solicitado_por_usuario?: UsuarioResponse | null;
  /** Detalles del fichaje original afectado. */
  fichaje_afectado?: RegistroFichaje | null;
  /** Detalles del usuario que aprobó la solicitud. */
  aprobado_por_usuario?: UsuarioResponse | null;
}
