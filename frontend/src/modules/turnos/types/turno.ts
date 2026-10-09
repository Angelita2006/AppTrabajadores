import { Empresa } from "../../empresas/types/empresa";

/**
 * Esquema para la creación de un nuevo turno.
 */
export interface TurnoCreate {
  /** Identificador único de la empresa asociada (UUID). */
  empresa_id: string;
  /** Nombre identificativo del turno (Ej: "Mañana Rotativo", "Nocturno Intensivo"). */
  nombre: string;
  /** Hora de inicio del turno en formato HH:MM:SS o HH:MM. */
  hora_inicio: string;
  /** Hora de finalización del turno en formato HH:MM:SS o HH:MM. */
  hora_fin: string;
  /** Duración de la pausa o descanso reglamentario en minutos. */
  duracion_pausa_minutos?: number;
  /** Días de la semana aplicables al turno (1=lunes ... 7=domingo). */
  dias_semana: number[];
}

/**
 * Esquema para la actualización de un turno.
 */
export interface TurnoUpdate {
  /** Nombre identificativo del turno. */
  nombre?: string;
  /** Hora de inicio del turno en formato HH:MM:SS o HH:MM. */
  hora_inicio?: string;
  /** Hora de finalización del turno en formato HH:MM:SS o HH:MM. */
  hora_fin?: string;
  /** Duración de la pausa o descanso reglamentario en minutos. */
  duracion_pausa_minutos?: number;
  /** Días de la semana aplicables al turno (1=lunes ... 7=domingo). */
  dias_semana?: number[];
  /** Estado de activación del turno. */
  activo?: boolean;
}

/**
 * Representa la definición base y completa de un horario laboral (Tabla: turnos).
 */
export interface Turno {
  /** Identificador único del turno maestro (UUID). */
  id: string;
  /** Identificador único de la empresa asociada (UUID). */
  empresa_id: string;
  /** Nombre identificativo del turno (Ej: "Mañana Rotativo", "Nocturno Intensivo"). */
  nombre: string;
  /** Hora de inicio del turno en formato HH:MM:SS o HH:MM. */
  hora_inicio: string;
  /** Hora de finalización del turno en formato HH:MM:SS o HH:MM. */
  hora_fin: string;
  /** Duración de la pausa o descanso reglamentario en minutos. */
  duracion_pausa_minutos: number;
  /** Días de la semana aplicables al turno (1=lunes ... 7=domingo). */
  dias_semana: number[];
  /** Indica si el turno está activo. */
  activo: boolean;
  /** Timestamp fecha y hora de la creación del turno. */
  created_at: string;

  /** Relación opcional con la entidad empresa cargada por el backend si se requiere. */
  empresa?: Empresa | null;
}

/**
 * Propiedades requeridas por el componente TabTurnos.
 */
export interface TabTurnosProps {
  /** Listado de turnos configurados para la empresa. */
  turnosEmpresa: Turno[];
  /** Función para actualizar el estado del listado de turnos de la empresa. */
  setTurnosEmpresa: React.Dispatch<React.SetStateAction<Turno[]>>;
  /** Objeto de la empresa seleccionada actualmente. */
  empresaActual: Empresa | null;
  /** Estado booleano que indica si se está ejecutando una operación de guardado/carga. */
  guardando: boolean;
  /** Función para actualizar el estado de guardado. */
  setGuardando: (guardando: boolean) => void;
  /** Objeto de estilos personalizados de la aplicación. */
  styles: any;
}
