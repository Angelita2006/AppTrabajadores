import { TipoContratoEnum, TipoJornadaEnum } from "../../../constants/enums";
import { CalendarioFestivo } from "../../calendarios-laborales/types/calendario";
import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import { Departamento } from "../../departamentos/types/departamento";
import { Empresa } from "../../empresas/types/empresa";
import { Trabajador } from "../../trabajadores/types/trabajador";

/**
 * Listado estático de los tipos de contratos laborales disponibles en el sistema,
 * sincronizados exactamente con el esquema del backend.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const TIPOS_CONTRATO = TipoContratoEnum;

/**
 * Tipo de unión que representa los diferentes tipos de contratos laborales permitidos.
 */
export type TipoContrato = (typeof TIPOS_CONTRATO)[keyof typeof TIPOS_CONTRATO];

/**
 * Listado estático de los tipos o regímenes de la jornada laboral asignada al contrato,
 * sincronizados exactamente con el esquema del backend.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const TIPOS_JORNADA = TipoJornadaEnum;

/**
 * Tipo de unión que representa los regímenes de jornada laboral permitidos.
 */
export type TipoJornada = (typeof TIPOS_JORNADA)[keyof typeof TIPOS_JORNADA];

/**
 * Esquema de datos requerido para el registro o alta de un nuevo contrato en el sistema.
 * Sincronizado con 'ContratoCreate' de Pydantic.
 */
export interface ContratoCreate {
  /** Identificador UUID único del trabajador titular del contrato. */
  trabajador_id: string;
  /** Identificador UUID único de la empresa u organización contratante. */
  empresa_id: string;
  /** Identificadores UUID de los centros de trabajo asociados. */
  centros_trabajo_ids: string[];
  /** Identificador UUID del departamento vinculado. */
  departamento_id: string;
  /** Modalidad o tipo de contrato aplicable. */
  tipo_contrato: TipoContrato;
  /** Régimen de la jornada laboral aplicable. */
  tipo_jornada: TipoJornada;
  /** Número total de horas semanales estipuladas. */
  horas_semana: number;
  /** Puesto de trabajo específico desempeñado por el empleado. */
  puesto_trabajo?: string | null;
  /** Categoría profesional asignada según convenio. */
  categoria_profesional?: string | null;
  pdf_url?: string | null;
  /** Fecha de inicio de vigencia del contrato en formato "AAAA-MM-DD". */
  fecha_inicio: string;
  /** Fecha de finalización del contrato en formato "AAAA-MM-DD", o nula si es indefinido. */
  fecha_fin?: string | null;
  /** Indicador booleano que determina si el contrato se encuentra activo. */
  activo?: boolean | null;
}

/**
 * Esquema para la actualización parcial o total de un contrato existente.
 * Sincronizado con 'ContratoUpdate' de Pydantic (campos opcionales).
 */
export interface ContratoUpdate {
  tipo_contrato?: TipoContrato;
  tipo_jornada?: TipoJornada;
  horas_semana?: number;
  puesto_trabajo?: string | null;
  categoria_profesional?: string | null;
  pdf_url?: string | null;
  fecha_inicio?: string;
  fecha_fin?: string | null;
  activo?: boolean | null;
  centros_trabajo_ids?: string[];
}

/**
 * Esquema base y simple utilizado para estructurar las respuestas JSON que el servidor envía.
 * Sincronizado con 'ContratoSimpleResponse' de Pydantic.
 */
export interface ContratoSimpleResponse {
  /** Identificador único universal (UUID v4) de la entidad contrato. */
  id: string;
  /** Identificador UUID único del trabajador titular del contrato. */
  trabajador_id: string;
  /** Identificador UUID único de la empresa u organización contratante. */
  empresa_id: string;
  /** Identificadores UUID de los centros de trabajo asociados. */
  centros_trabajo_ids: string[];
  /** Identificador UUID opcional del departamento al que pertenece el contrato. */
  departamento_id: string;
  /** Modalidad o tipo de contrato aplicable. */
  tipo_contrato: TipoContrato;
  /** Régimen de la jornada laboral aplicable. */
  tipo_jornada: TipoJornada;
  /** Número total de horas semanales estipuladas. */
  horas_semana: number;
  /** Puesto de trabajo específico desempeñado por el empleado. */
  puesto_trabajo?: string | null;
  /** Categoría profesional asignada según convenio. */
  categoria_profesional?: string | null;
  pdf_url?: string | null;
  /** Fecha de inicio de vigencia del contrato en formato estándar "AAAA-MM-DD". */
  fecha_inicio: string;
  /** Fecha de finalización del contrato en formato "AAAA-MM-DD", o nula si es indefinido. */
  fecha_fin?: string | null;
  /** Indicador booleano que determina si el contrato se encuentra activo actualmente. */
  activo: boolean | null;
  /** Marca de tiempo (ISO 8601 con zona horaria) de la fecha de creación del registro. */
  created_at: string;
  /** Marca de tiempo (ISO 8601 con zona horaria) de la última actualización del registro. */
  updated_at: string;
}

/**
 * Representa la entidad completa del contrato laboral de un empleado en el sistema,
 * sincronizada con la respuesta completa de Pydantic incluyendo todas las relaciones anidadas
 * (trabajador, empresa, centro_trabajo, departamento y calendario_laboral).
 */
export interface Contrato extends ContratoSimpleResponse {
  /** Campo legado/derivado usado por algunas pantallas, fuera del contrato REST. */
  calendario_laboral_id?: string | null;
  /** Relación opcional enriquecida para cargas anidadas del trabajador vinculado. */
  trabajador?: Trabajador | null;
  /** Relación opcional enriquecida para cargas anidadas de la empresa vinculada. */
  empresa?: Empresa | null;
  /** Relación opcional enriquecida para cargas anidadas del centro de trabajo vinculado. */
  centros_trabajo?: CentroTrabajo[];
  /** Relación opcional enriquecida para cargas anidadas del departamento vinculado. */
  departamento?: Departamento | null;
}

/** Campos calculados por la interfaz; no forman parte de ContratoResponse. */
export interface ContratoView extends Contrato {
  calendario_laboral?: CalendarioFestivo | null;
}
