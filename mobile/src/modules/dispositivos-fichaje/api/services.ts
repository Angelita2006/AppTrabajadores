import api from "@/src/service/api/api";
import {
  Dispositivo,
  DispositivoCreate,
  DispositivoUpdate,
} from "../types/dispositivo-fichaje";

/**
 * Obtiene el listado completo de dispositivos de fichaje asociados a una empresa u organización específica.
 * URI: GET /api/dispositivos/empresa/{empresaId}
 *
 * @async
 * @function obtenerDispositivosEmpresa
 * @param {string} idEmpresa - Identificador único de la empresa.
 * @returns {Promise<Dispositivo[]>} Promesa con el listado de dispositivos encontrados.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener los dispositivos de la empresa.
 */
export const obtenerDispositivosEmpresa = async (
  idEmpresa: string,
): Promise<Dispositivo[]> => {
  try {
    const response = await api.get<Dispositivo[]>(
      `/api/dispositivos/empresa/${idEmpresa}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener los dispositivos de la empresa.",
    );
  }
};

/**
 * Obtiene el listado de dispositivos de fichaje vinculados a un centro de trabajo determinado.
 * URI: GET /api/dispositivos/centro/{centroId}
 *
 * @async
 * @function obtenerDispositivosCentro
 * @param {string} idCentro - Identificador único del centro de trabajo.
 * @returns {Promise<Dispositivo[]>} Promesa con el listado de dispositivos del centro.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener los dispositivos del centro.
 */
export const obtenerDispositivosCentro = async (
  idCentro: string,
): Promise<Dispositivo[]> => {
  try {
    const response = await api.get<Dispositivo[]>(
      `/api/dispositivos/centro/${idCentro}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener los dispositivos del centro de trabajo.",
    );
  }
};

/**
 * Registra un nuevo dispositivo de fichaje en el sistema bajo la configuración provista.
 * URI: POST /api/dispositivos
 *
 * @async
 * @function crearDispositivo
 * @param {DispositivoCreate} payload - Objeto con los datos necesarios para la creación del dispositivo.
 * @returns {Promise<Dispositivo>} Promesa con el objeto `Dispositivo` recién creado y persistido.
 * @throws {Error} Lanza un error si los datos no son válidos o falla el registro en el servidor.
 */
export const crearDispositivo = async (
  payload: DispositivoCreate,
): Promise<Dispositivo> => {
  try {
    const response = await api.post<Dispositivo>("/api/dispositivos", payload);
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al registrar el dispositivo en el servidor.",
    );
  }
};

/**
 * Actualiza la configuración, estado o asignación de un dispositivo de fichaje existente.
 * URI: PUT /api/dispositivos/{dispositivoId}
 *
 * @async
 * @function editarDispositivo
 * @param {string} idDispositivo - Identificador único del dispositivo a modificar.
 * @param {DispositivoUpdate} payload - Objeto con los campos actualizados.
 * @returns {Promise<Dispositivo>} Promesa con el objeto `Dispositivo` con los cambios aplicados.
 * @throws {Error} Lanza un error si el dispositivo no existe o la API rechaza la actualización.
 */
export const editarDispositivo = async (
  idDispositivo: string,
  payload: DispositivoUpdate,
): Promise<Dispositivo> => {
  try {
    const response = await api.put<Dispositivo>(
      `/api/dispositivos/${idDispositivo}`,
      payload,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al actualizar el dispositivo en el servidor.",
    );
  }
};

/**
 * Da de baja o elimina un dispositivo de fichaje del sistema de forma definitiva.
 * URI: DELETE /api/dispositivos/{dispositivoId}
 *
 * @async
 * @function eliminarDispositivo
 * @param {string} idDispositivo - Identificador único del dispositivo a eliminar.
 * @returns {Promise<void>} Promesa que se resuelve al completar la operación de borrado.
 * @throws {Error} Lanza un error si el dispositivo no se encuentra o falla la operación.
 */
export const eliminarDispositivo = async (
  idDispositivo: string,
): Promise<void> => {
  try {
    await api.delete(`/api/dispositivos/${idDispositivo}`);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al eliminar el dispositivo.");
  }
};
