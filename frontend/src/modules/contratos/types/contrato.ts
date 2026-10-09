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
export const TIPOS_CONTRATO = {
  /** Contrato laboral de duración indefinida. */
  INDEFINIDO: "Indefinido",
  /** Contrato laboral de carácter temporal o por obra/servicio. */
  TEMPORAL: "Temporal",
  /** Contrato enfocado a la formación y aprendizaje del empleado. */
  FORMACION: "Formación",
  /** Contrato en prácticas profesionales para titulados. */
  PRACTICAS: "Prácticas",
  /** Contrato fijo discontinuo para trabajos estacionales o periódicos. */
  FIJO_DISCONTINUO: "Fijo_discontinuo",
  /** Cualquier otro tipo de modalidad contractual no especificada. */
  OTRO: "Otro",
} as const;

/**
 * Tipo de unión que representa los diferentes tipos de contratos laborales permitidos.
 */
export type TipoContrato = (typeof TIPOS_CONTRATO)[keyof typeof TIPOS_CONTRATO];

/**
 * Listado estático de los tipos o regímenes de la jornada laboral asignada al contrato,
 * sincronizados exactamente con el esquema del backend.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const TIPOS_JORNADA = {
  /** Jornada laboral completa según convenio o legislación vigente. */
  COMPLETA: "Completa",
  /** Jornada laboral parcial con cómputo reducido de horas semanales. */
  PARCIAL: "Parcial",
} as const;

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
  /** Identificador UUID único del centro de trabajo asignado. */
  centro_trabajo_id: string;
  /** Identificador UUID opcional del departamento al que pertenece el contrato. */
  departamento_id?: string | null;
  /** Identificador UUID opcional del calendario laboral o festivo asignado. */
  calendario_laboral_id?: string | null;
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
  /** Fecha de inicio de vigencia del contrato en formato "AAAA-MM-DD". */
  fecha_inicio: string;
  /** Fecha de finalización del contrato en formato "AAAA-MM-DD", o nula si es indefinido. */
  fecha_fin?: string | null;
  /** Indicador booleano que determina si el contrato se encuentra activo. */
  activo?: boolean;
}

/**
 * Esquema para la actualización parcial o total de un contrato existente.
 * Sincronizado con 'ContratoUpdate' de Pydantic (campos opcionales).
 */
export interface ContratoUpdate {
  centro_trabajo_id?: string;
  departamento_id?: string | null;
  calendario_laboral_id?: string | null;
  tipo_contrato?: TipoContrato;
  tipo_jornada?: TipoJornada;
  horas_semana?: number;
  puesto_trabajo?: string | null;
  categoria_profesional?: string | null;
  fecha_inicio?: string;
  fecha_fin?: string | null;
  activo?: boolean;
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
  /** Identificador UUID único del centro de trabajo asignado. */
  centro_trabajo_id: string;
  /** Identificador UUID opcional del departamento al que pertenece el contrato. */
  departamento_id?: string | null;
  /** Identificador UUID opcional del calendario laboral o festivo asignado. */
  calendario_laboral_id?: string | null;
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
  /** Fecha de inicio de vigencia del contrato en formato estándar "AAAA-MM-DD". */
  fecha_inicio: string;
  /** Fecha de finalización del contrato en formato "AAAA-MM-DD", o nula si es indefinido. */
  fecha_fin?: string | null;
  /** Indicador booleano que determina si el contrato se encuentra activo actualmente. */
  activo: boolean;
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
  /** Relación opcional enriquecida para cargas anidadas del trabajador vinculado. */
  trabajador?: Trabajador | null;
  /** Relación opcional enriquecida para cargas anidadas de la empresa vinculada. */
  empresa?: Empresa | null;
  /** Relación opcional enriquecida para cargas anidadas del centro de trabajo vinculado. */
  centro_trabajo?: CentroTrabajo | null;
  /** Relación opcional enriquecida para cargas anidadas del departamento vinculado. */
  departamento?: Departamento | null;
  /** Relación opcional enriquecida para cargas anidadas del calendario festivo vinculado. */
  calendario_laboral?: CalendarioFestivo | null;
}
