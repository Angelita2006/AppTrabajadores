import { Fichaje } from "../../../modules/fichajes/types/fichaje";
import { mockDb } from "../../../services/api/mockDb";

/**
 * Registra un nuevo evento de fichaje (entrada, salida o descanso) en el sistema.
 * Envía las credenciales del empleado y de la empresa para asociar correctamente el marcaje.
 */
export const crearFichaje = async (
  idTrabajador: number,
  idEmpresa: number,
  tipo: Fichaje["tipo"],
): Promise<Fichaje> => mockDb.createFichaje(idTrabajador, idEmpresa, tipo);

/**
 * Función preparada para modificar un registro de fichaje existente.
 * Actualmente lanza un error controlado ya que la persistencia de edición no está activa en la simulación.
 */
export const editarFichaje = async (): Promise<Fichaje> => {
  throw new Error("editarFichaje no implementado en mock");
};

/** Función preparada para futuras integraciones de borrado de registros de fichajes. */
export const eliminarFichaje = async (): Promise<void> => undefined;

/** Obtiene el historial global absoluto con todos los fichajes registrados en la aplicación. */
export const obtenerFichajes = async (): Promise<Fichaje[]> =>
  mockDb.getFichajes();

/**
 * Recupera la información de un fichaje específico utilizando su identificador único.
 * Realiza una búsqueda en la lista global y lanza un error si el registro no existe.
 */
export const obtenerFichaje = async (idFichaje: number): Promise<Fichaje> => {
  const fichajes = await mockDb.getFichajes();
  const fichaje = fichajes.find((item) => item.id === idFichaje);
  if (!fichaje) throw new Error("Fichaje no encontrado");
  return fichaje;
};

/**
 * Consulta y extrae de forma ordenada el historial de marcajes de un trabajador en una empresa concreta.
 * Se utiliza habitualmente para rellenar los listados de actividad diaria y calcular los estados.
 */
export const obtenerFichajesTrabajadorEmpresa = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Fichaje[]> =>
  mockDb.getFichajesTrabajadorEmpresa(idTrabajador, idEmpresa);

/** Alias secundario de la función que recupera el historial de marcajes filtrado por empresa y empleado. */
export const obtenerFichajesEmpresaTrabajador =
  obtenerFichajesTrabajadorEmpresa;
