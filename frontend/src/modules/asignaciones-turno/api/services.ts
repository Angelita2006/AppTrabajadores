import api from "@/src/service/api/api";
import {
  AsignacionTurno,
  AsignacionTurnoCreate,
  AsignacionTurnoMasivaCreate,
} from "../types/asignacion-turno";

/**
 * Registra una nueva asignación de turno individual para un trabajador en el sistema.
 * URI: POST /api/asignaciones-turno
 *
 * @async
 * @function crearAsignacionTurno
 * @param {AsignacionTurnoCreate} payload - Objeto con los datos requeridos para dar de alta la asignación de turno.
 * @returns {Promise<AsignacionTurno>} Promesa con el objeto `AsignacionTurno` recién creado.
 * @throws {Error} Lanza un error si falla la creación o existen inconsistencias en los datos proporcionados.
 */
export const crearAsignacionTurno = async (
  payload: AsignacionTurnoCreate,
): Promise<AsignacionTurno> => {
  try {
    const response = await api.post<AsignacionTurno>(
      "/api/asignaciones-turno",
      payload,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al registrar la nueva asignación de turno.",
    );
  }
};

/**
 * Registra de forma masiva múltiples asignaciones de turno para un trabajador de manera atómica.
 * URI: POST /api/asignaciones-turno/masiva
 *
 * @async
 * @function crearAsignacionTurnoMasiva
 * @param {AsignacionTurnoMasivaCreate} payload - Objeto con los datos requeridos para la asignación masiva.
 * @returns {Promise<AsignacionTurno[]>} Promesa con el listado de asignaciones de turno creadas.
 * @throws {Error} Lanza un error si falla el proceso masivo o existen inconsistencias.
 */
export const crearAsignacionTurnoMasiva = async (
  payload: AsignacionTurnoMasivaCreate,
): Promise<AsignacionTurno[]> => {
  try {
    const response = await api.post<AsignacionTurno[]>(
      "/api/asignaciones-turno/masiva",
      payload,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al registrar la asignación masiva de turnos.",
    );
  }
};

/**
 * Recupera el listado o cuadrante de turnos teóricos asignados a un trabajador específico.
 * URI: GET /api/asignaciones-turno/trabajador/{idTrabajador}
 *
 * @async
 * @function obtenerAsignacionesTurnoTrabajador
 * @param {string} idTrabajador - Identificador UUID del expediente del empleado.
 * @returns {Promise<AsignacionTurno[]>} Promesa con la lista de asignaciones de turno del trabajador.
 * @throws {Error} Lanza un error si ocurre un fallo al realizar la consulta al servidor.
 */
export const obtenerAsignacionesTurnoTrabajador = async (
  idTrabajador: string,
): Promise<AsignacionTurno[]> => {
  if (!idTrabajador || idTrabajador === "1" || idTrabajador.length < 10) {
    return [];
  }
  try {
    const response = await api.get<AsignacionTurno[]>(
      `/api/asignaciones-turno/trabajador/${idTrabajador}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al obtener las asignaciones de turno del trabajador ${idTrabajador}.`,
    );
  }
};

/**
 * Elimina de forma definitiva una asignación de turno individual por su identificador único.
 * URI: DELETE /api/asignaciones-turno/{idAsignacion}
 *
 * @async
 * @function eliminarAsignacionTurno
 * @param {string} idAsignacion - Identificador UUID único de la asignación a eliminar.
 * @returns {Promise<void>} Promesa que se resuelve al completar la eliminación.
 * @throws {Error} Lanza un error si la asignación no existe o falla la operación.
 */
export const eliminarAsignacionTurno = async (
  idAsignacion: string,
): Promise<void> => {
  try {
    await api.delete(`/api/asignaciones-turno/${idAsignacion}`);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Error al eliminar la asignación de turno ${idAsignacion}.`,
    );
  }
};

/**
 * Elimina de forma masiva todas las asignaciones de turno vinculadas a un trabajador específico.
 * URI: DELETE /api/asignaciones-turno/trabajador/{idTrabajador}/eliminar-todas
 *
 * @async
 * @function eliminarTodasAsignacionesTrabajador
 * @param {string} idTrabajador - Identificador UUID del expediente del empleado.
 * @returns {Promise<any>} Promesa con la respuesta del servidor al completar el borrado masivo.
 * @throws {Error} Lanza un error si falla la eliminación en el servidor.
 */
export const eliminarTodasAsignacionesTrabajador = async (
  idTrabajador: string,
): Promise<any> => {
  if (!idTrabajador || idTrabajador === "1" || idTrabajador.length < 10) {
    return null;
  }
  try {
    const response = await api.delete(
      `/api/asignaciones-turno/trabajador/${idTrabajador}/eliminar-todas`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al eliminar todas las asignaciones del trabajador ${idTrabajador}.`,
    );
  }
};
