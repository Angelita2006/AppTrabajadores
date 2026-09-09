import { AsignacionTurno } from "../../asignaciones-turno/types/asignacion-turno";
import { Contrato } from "../../contratos/types/contrato";
import { Empresa } from "../../empresas/types/empresa";
import { Rol } from "../../roles/types/rol";

/**
 * Listado estático de los diferentes estados operativos de un trabajador en la plataforma,
 * mapeados a sus respectivos valores numéricos almacenados en la base de datos.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const ESTADOS_TRABAJADOR = {
  INACTIVO: 0,
  ACTIVO: 1,
  TRABAJANDO: 2,
  DESCANSANDO: 3,
  HORAS_EXTRA: 4,
  VACACIONES: 5,
  BAJA: 6,
} as const;

/**
 * Tipo numérico de unión que representa los diferentes estados operativos de un trabajador en la plataforma.
 */
export type Estado =
  (typeof ESTADOS_TRABAJADOR)[keyof typeof ESTADOS_TRABAJADOR];

/**
 * Esquema para la creación o registro de un nuevo trabajador (POST /api/trabajadores).
 */
export interface TrabajadorCreate {
  /** Identificador único de la empresa asociada (UUID). */
  empresa_id: string;
  /** Identificador único del rol asignado al trabajador. */
  rol_id: string;
  /** Identificación Fiscal oficial (DNI/NIF/NIE, 9 caracteres, 8 dígitos y 1 letra final). */
  dni_nif_nie: string;
  /** Nombre oficial del empleado. */
  nombre: string;
  /** Apellidos del empleado. */
  apellidos: string;
  /** Fecha de nacimiento del empleado en formato "AAAA-MM-DD". */
  fecha_nacimiento: string;
  /** Número de la Seguridad Social. */
  numero_seguridad_social: string;
  /** Correo electrónico de contacto. */
  email?: string | null;
  /** Teléfono de contacto. */
  telefono?: string | null;
  /** URL o ruta de la fotografía del trabajador. */
  foto_url?: string | null;
}

/**
 * Esquema para la actualización parcial de un trabajador existente (PATCH /api/trabajadores/{id}).
 */
export interface TrabajadorUpdate {
  /** Identificador único de la empresa asociada. */
  empresa_id?: string;
  /** Identificador único del rol asignado al trabajador. */
  rol_id?: string;
  /** Identificación Fiscal oficial (DNI/NIF/NIE, 9 caracteres, 8 dígitos y 1 letra final). */
  dni_nif_nie?: string;
  /** Nombre de pila del empleado. */
  nombre?: string;
  /** Apellidos del empleado. */
  apellidos?: string;
  /** Fecha de nacimiento del empleado en formato "AAAA-MM-DD". */
  fecha_nacimiento?: string;
  /** Número de la Seguridad Social. */
  numero_seguridad_social?: string;
  /** Estado operativo del trabajador (true para activo, false para inactivo). */
  activo?: boolean;
  /** Estado numérico complementario del trabajador. */
  estado?: number | null;
  /** Fecha de baja laboral de la empresa si aplica en formato "AAAA-MM-DD". */
  fecha_baja_empresa?: string | null;
  /** Correo electrónico de contacto. */
  email?: string | null;
  /** Teléfono de contacto. */
  telefono?: string | null;
  /** URL o ruta de la fotografía del trabajador. */
  foto_url?: string | null;
}

/**
 * Representa la definición base y completa del expediente laboral de un trabajador (Tabla: trabajadores).
 */
export interface Trabajador {
  /** Identificador UUID único del trabajador (gen_random_uuid). */
  id: string;
  /** Identificador único de la empresa asociada (Tenant de aislamiento multiempresa). */
  empresa_id: string;
  /** Identificador único del rol asignado al trabajador. */
  rol_id: string;
  /** Identificación Fiscal oficial (DNI/NIF/NIE, 9 caracteres, 8 dígitos y 1 letra final). */
  dni_nif_nie: string;
  /** Nombre de pila del empleado. */
  nombre: string;
  /** Apellidos del empleado. */
  apellidos: string;
  /** Fecha de nacimiento del empleado en formato "AAAA-MM-DD". */
  fecha_nacimiento: string;
  /** Número de la Seguridad Social. */
  numero_seguridad_social: string;
  /** Estado operativo del trabajador (true por defecto). */
  activo: boolean;
  /** Estado numérico complementario del trabajador basado en el enum Estado. */
  estado?: number;
  /** Fecha formal de contratación en la empresa en formato "AAAA-MM-DD". */
  fecha_alta_empresa: string;
  /** Fecha de baja laboral de la empresa si aplica en formato "AAAA-MM-DD". */
  fecha_baja_empresa?: string | null;
  /** Correo electrónico de contacto. */
  email?: string | null;
  /** Teléfono de contacto. */
  telefono?: string | null;
  /** URL o ruta de la fotografía del trabajador. */
  foto_url?: string | null;
  /** Listado completo de contratos históricos o asociados al trabajador. */
  contratos?: Contrato[];
  /** Contrato laboral activo actual del trabajador, o null si no dispone de uno vigente. */
  contratoActivo?: Contrato | null;
  /** Turno asignado vigente del trabajador, o null si no tiene ninguno asignado actualmente. */
  turnoAsignadoVigente?: AsignacionTurno | null;
  /** Lista de asignaciones de turnos vigentes del trabajador, o null si no tiene ninguna asignada actualmente. */
  turnosAsignadosVigentes?: AsignacionTurno[] | null;
  /** Marca de tiempo de inserción real del registro en formato ISO DateTime. */
  created_at: string;
  /** Marca de tiempo de la última modificación en formato ISO DateTime. */
  updated_at: string;

  /** Detalles de la empresa asociada (relación anidada de Pydantic). */
  empresa?: Empresa | null;
  /** Detalles del rol asociado (relación anidada de Pydantic). */
  rol?: Rol | null;
}

/**
 * Interfaz extendida de un trabajador orientada a paneles de plantilla y gestión de personal.
 */
export interface TrabajadorPlantilla extends Trabajador {
  /** Contrato laboral activo actual del trabajador, o null si no dispone de uno vigente. */
  contratoActivo: Contrato | null;
  /** Turno asignado vigente del trabajador, o null si no tiene ninguno asignado actualmente. */
  turnoAsignadoVigente: AsignacionTurno | null;
}

/**
 * Interfaz para la solicitud de asignación masiva de turnos a un trabajador (POST /api/trabajadores/{id}/turnos).
 */
export interface AsignarTurnosRequest {
  /** Lista de identificadores únicos (UUIDs) de los turnos que se desea asignar. */
  turnos: string[];
}

/**
 * Estructura de datos del Trabajador gestionado en la ficha (Hereda directamente de Trabajador).
 */
export interface TrabajadorItem extends Trabajador {
  /** Estado numérico operativo del trabajador. */
  estado: number;
  /** Contrato laboral activo actual del trabajador, o null si no dispone de uno vigente. */
  contratoActivo: Contrato | null;
  /** Lista de asignaciones de turnos vigentes del trabajador, o null si no tiene ninguna asignada actualmente. */
  turnosAsignadosVigentes: AsignacionTurno[] | null;
}

/**
 * Propiedades del componente FichaTrabajador.
 */
export interface FichaTrabajadorProps {
  /** Objeto de datos con la información completa del trabajador a renderizar. */
  item: Trabajador;
  /** Función ejecutada al seleccionar o interactuar con la tarjeta del trabajador. */
  onSeleccionarTrabajador: () => void;
  /** Función para actualizar el estado del modal activo a mostrar en pantalla. */
  setModalActivo: (modal: string) => void;
  /** Función disparada para abrir la interfaz de edición del contrato del trabajador. */
  abrirEdicionContrato: (trabajador: Trabajador) => void;
  /** Función para preparar los parámetros antes de asignar un turno nuevo. */
  prepararAsignarTurno: (trabajador: Trabajador) => void;
  /** Función manejadora para procesar la asignación directa de turnos al trabajador. */
  handleAsignarTurnoTrabajador: () => void;
  /** Diccionario de estilos visuales aplicados al componente. */
  styles: Record<string, any>;
}
