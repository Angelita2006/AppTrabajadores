import { CalendarioFestivo } from "../../calendarios-laborales/types/calendario";
import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import { Departamento } from "../../departamentos/types/departamento";
import { Empresa } from "../../empresas/types/empresa";
import { Trabajador } from "../../trabajadores/types/trabajador";

// Enums basados exactamente en TipoContratoEnum y TipoJornadaEnum del Backend
export enum TipoContratoEnum {
  INDEFINIDO = "Indefinido",
  TEMPORAL = "Temporal",
  FORMACION = "Formación",
  PRACTICAS = "Prácticas",
}

export enum TipoJornadaEnum {
  COMPLETA = "Completa",
  PARCIAL = "Parcial",
}

/**
 * Representa el contrato laboral de un empleado (Tabla: contratos)
 */
export interface Contrato {
  id: string; // UUID v4 mapeado como string
  trabajador_id: string; // UUID v4
  empresa_id: string; // UUID v4
  centro_trabajo_id: string; // UUID v4
  departamento_id: string; // UUID v4 opcional
  calendario_laboral_id: string; // UUID v4 opcional

  tipo_contrato: TipoContratoEnum;
  tipo_jornada: TipoJornadaEnum;
  horas_semana: number; // Mapeado desde el Decimal(5,2) del backend

  puesto_trabajo: string | null;
  categoria_profesional: string | null;

  fecha_inicio: string; // Formato de fecha "AAAA-MM-DD"
  fecha_fin: string | null; // Formato de fecha "AAAA-MM-DD" o null si es indefinido

  activo: boolean;
  created_at: string; // ISO DateTime string (DateTime con Zona Horaria)
  updated_at: string; // ISO DateTime string

  // Relaciones opcionales para cargas anidadas (eager loading)
  trabajador?: Trabajador | null;
  empresa?: Empresa | null;
  centro_trabajo?: CentroTrabajo | null;
  departamento?: Departamento | null;
  calendario_laboral?: CalendarioFestivo | null;
}
