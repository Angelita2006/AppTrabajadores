import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import { Empresa } from "../../empresas/types/empresa";

/**
 * Esquema de datos requerido para el registro o alta de un nuevo departamento en el sistema.
 * Sincronizado con 'DepartamentoCreate' de Pydantic.
 */
export interface DepartamentoCreate {
  /** Identificador de la empresa u organización (tenant) propietaria del departamento (UUID). */
  empresa_id: string;
  /** Nombre descriptivo del nuevo departamento. */
  nombre: string;
  /** Identificador del centro de trabajo al que se asociará inicialmente (UUID). */
  centro_trabajo_id: string;
}

/**
 * Esquema para la actualización parcial o total de un departamento existente,
 * sincronizado con el esquema Pydantic DepartamentoUpdate (campos opcionales).
 */
export interface DepartamentoUpdate {
  /** Nuevo nombre descriptivo para el departamento. */
  nombre?: string;
  /** Nuevo identificador del centro de trabajo vinculado (UUID). */
  centro_trabajo_id?: string;
}

/**
 * Esquema base y simple utilizado para estructurar las respuestas JSON que el servidor envía.
 * Sincronizado con 'DepartamentoSimpleResponse' de Pydantic.
 */
export interface DepartamentoSimpleResponse {
  /** Identificador único universal (UUID) autogenerado del departamento. */
  id: string;
  /** Identificador de la empresa u organización (tenant) a la que pertenece el departamento. */
  empresa_id: string;
  /** Nombre descriptivo asignado al departamento. */
  nombre: string;
  /** Identificador del centro de trabajo vinculado al departamento. */
  centro_trabajo_id: string;
  /** Marca de tiempo de cuándo fue creado el departamento en el sistema en formato ISO DateTime. */
  created_at: string;
  /** Marca de tiempo de la última modificación realizada en el departamento en formato ISO DateTime. */
  updated_at: string;
}

/**
 * Representa la estructura completa de un Departamento sincronizada
 * exactamente con el esquema DepartamentoResponse del backend, incluyendo relaciones anidadas.
 */
export interface Departamento extends DepartamentoSimpleResponse {
  /** Relación opcional con la entidad empresa asociada cargada por el backend. */
  empresa?: Empresa | null;
  /** Relación opcional con la entidad centro de trabajo asociada cargada por el backend. */
  centro_trabajo?: CentroTrabajo | null;
}
