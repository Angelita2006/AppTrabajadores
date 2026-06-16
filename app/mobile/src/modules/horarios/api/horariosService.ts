import { Horario } from "../../../modules/horarios/types/horario";
import { mockDb } from "../../../services/api/mockDb";

/**
 * Función preparada para registrar un nuevo cuadrante de horarios en el sistema.
 * Actualmente lanza un error controlado ya que la persistencia de inserción no está activa en la simulación.
 */
export const crearHorario = async (): Promise<Horario> => {
  throw new Error("crearHorario no implementado en mock");
};

/**
 * Función preparada para modificar un cuadrante de horarios existente.
 * Actualmente lanza un error controlado ya que la persistencia de edición no está activa en la simulación.
 */
export const editarHorario = async (): Promise<Horario> => {
  throw new Error("editarHorario no implementado en mock");
};

/** Función preparada para futuras integraciones de borrado de cuadrantes horarios. */
export const eliminarHorario = async (): Promise<void> => undefined;

/** Obtiene la lista completa con todos los horarios y turnos registrados en la aplicación. */
export const obtenerHorarios = async (): Promise<Horario[]> =>
  mockDb.getHorarios();

/**
 * Recupera un cuadrante de horario específico mediante su ID único.
 * Realiza una búsqueda en el listado global y lanza un error si el identificador no existe.
 */
export const obtenerHorario = async (idHorario: number): Promise<Horario> => {
  const horarios = await mockDb.getHorarios();
  const horario = horarios.find((item) => item.id === idHorario);
  if (!horario) throw new Error("Horario no encontrado");
  return horario;
};

/**
 * Consulta y recupera el cuadrante de turnos asignado a un trabajador dentro de una empresa específica.
 * Devuelve el objeto con las horas de entrada y salida, o null si el empleado no tiene un horario asignado.
 */
export const obtenerHorarioTrabajadorEmpresa = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Horario | null> =>
  mockDb.getHorarioTrabajadorEmpresa(idTrabajador, idEmpresa);
