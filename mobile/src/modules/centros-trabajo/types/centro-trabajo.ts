import { Empresa } from "../../empresas/types/empresa";

/**
 * Representa la entidad completa de un centro de trabajo o sede física en el sistema.
 * Sincronizado con la tabla 'centros_trabajo' de la base de datos PostgreSQL.
 */
export interface CentroTrabajo {
  /** Identificador único universal (UUID v4) autogenerado para el centro de trabajo. */
  id: string;
  /** Identificador UUID único de la empresa u organización propietaria (tenant). */
  empresa_id: string;
  /** Nombre identificativo o descriptivo de la sede física. */
  nombre: string;
  /** Zona horaria aplicable al centro (por defecto "Europe/Madrid"). */
  zona_horaria: string;
  /** Indicador booleano que determina si el centro de trabajo se encuentra operativo. */
  activo: boolean;
  /** Marca de tiempo (ISO 8601 con zona horaria) de la fecha de creación del registro. */
  created_at: string;
  /** Marca de tiempo (ISO 8601 con zona horaria) de la última actualización del registro. */
  updated_at: string;
  /** Código de Cuenta de Cotización (CCC) asociado. */
  codigo_ccc: string | null;
  /** Dirección física o postal completa de la sede. */
  direccion: string;
  /** Coordenada de latitud geográfica para geolocalización. */
  latitud: number;
  /** Coordenada de longitud geográfica para geolocalización. */
  longitud: number;

  /** Relación opcional enriquecida para cargas anidadas de la empresa vinculada. */
  empresa?: Empresa | null;
}

/**
 * Estructura de datos requerida para el registro o creación de un nuevo centro de trabajo.
 * Sincronizado exactamente con el esquema del backend.
 */
export interface CentroTrabajoCreate {
  /** Identificador UUID único de la empresa u organización propietaria (tenant). */
  empresa_id: string;
  /** Nombre identificativo de la sede física. */
  nombre: string;
  /** Estado inicial de actividad del centro de trabajo. */
  activo: boolean;
  /** Zona horaria aplicable (por defecto "Europe/Madrid"). */
  zona_horaria: string;
  /** Código de Cuenta de Cotización (CCC). */
  codigo_ccc: string;
  /** Dirección física o postal completa de la sede. */
  direccion: string;
  /** Coordenada de latitud geográfica. */
  latitud: number;
  /** Coordenada de longitud geográfica. */
  longitud: number;
}

/**
 * Estructura de datos para la actualización parcial (patch) de los parámetros de un centro de trabajo existente.
 */
export interface CentroTrabajoUpdate {
  /** Nuevo nombre identificativo de la sede física. */
  nombre: string;
  /** Nueva zona horaria. */
  zona_horaria: string;
  /** Nuevo estado de operatividad del centro. */
  activo: boolean;
  /** Código de Cuenta de Cotización (CCC) actualizado. */
  codigo_ccc: string;
  /** Dirección física o postal actualizada. */
  direccion: string;
  /** Coordenada de latitud geográfica actualizada. */
  latitud: number;
  /** Coordenada de longitud geográfica actualizada. */
  longitud: number;
}
