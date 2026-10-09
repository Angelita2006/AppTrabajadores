import api from "@/src/service/api/api";
import {
    CorreccionFichajeCreate,
    CorreccionFichajeResponse,
} from "../types/correccion";

/**
 * Registra una nueva solicitud de rectificación horaria en el sistema.
 * URI: POST /api/correcciones
 *
 * @async
 * @function crearCorreccion
 * @param {CorreccionFichajeCreate} payload - Objeto con los datos necesarios para crear la solicitud de corrección.
 * @returns {Promise<CorreccionFichajeResponse>} Promesa con el objeto `CorreccionFichajeResponse` recién creado.
 * @throws {Error} Lanza un error si los datos no son válidos o falla el registro en el servidor.
 */
export const crearCorreccion = async (
  payload: CorreccionFichajeCreate,
): Promise<CorreccionFichajeResponse> => {
  try {
    const response = await api.post<CorreccionFichajeResponse>(
      "/api/correcciones",
      payload,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al registrar la solicitud de corrección horaria.",
    );
  }
};

/**
 * Obtiene el listado completo de solicitudes de corrección de fichaje en el sistema.
 * URI: GET /api/correcciones
 *
 * @async
 * @function obtenerTodasLasCorrecciones
 * @returns {Promise<CorreccionFichajeResponse[]>} Promesa con el listado de todas las correcciones registradas.
 * @throws {Error} Lanza un error si falla la consulta al servidor.
 */
export const obtenerTodasLasCorrecciones = async (): Promise<
  CorreccionFichajeResponse[]
> => {
  try {
    const response =
      await api.get<CorreccionFichajeResponse[]>("/api/correcciones");
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener el listado completo de correcciones.",
    );
  }
};

/**
 * Obtiene el listado de solicitudes de corrección asociadas a una empresa u organización específica.
 * URI: GET /api/correcciones/empresa/{idEmpresa}
 *
 * @async
 * @function obtenerCorreccionesPorEmpresa
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @returns {Promise<CorreccionFichajeResponse[]>} Promesa con el listado de correcciones de la empresa.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener las correcciones.
 */
export const obtenerCorreccionesPorEmpresa = async (
  idEmpresa: string,
): Promise<CorreccionFichajeResponse[]> => {
  try {
    const response = await api.get<CorreccionFichajeResponse[]>(
      `/api/correcciones/empresa/${idEmpresa}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al obtener las correcciones de la empresa ${idEmpresa}.`,
    );
  }
};

/**
 * Obtiene el histórico de peticiones de rectificación horaria realizadas por un trabajador específico.
 * URI: GET /api/correcciones/trabajador/{idTrabajador}
 *
 * @async
 * @function obtenerCorreccionesPorTrabajador
 * @param {string} idTrabajador - Identificador UUID único del trabajador.
 * @returns {Promise<CorreccionFichajeResponse[]>} Promesa con el listado de correcciones del trabajador.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener las correcciones.
 */
export const obtenerCorreccionesPorTrabajador = async (
  idTrabajador: string,
): Promise<CorreccionFichajeResponse[]> => {
  try {
    const response = await api.get<CorreccionFichajeResponse[]>(
      `/api/correcciones/trabajador/${idTrabajador}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al obtener las correcciones del trabajador ${idTrabajador}.`,
    );
  }
};

/**
 * Resuelve una solicitud de corrección cambiando su estado a 'Aprobada' o 'Rechazada'.
 * URI: PUT /api/correcciones/{idCorreccion}/resolver
 *
 * @async
 * @function resolverCorreccion
 * @param {string} idCorreccion - Identificador UUID único de la solicitud de corrección.
 * @param {"Aprobada" | "Rechazada"} nuevoEstado - Nuevo estado que se aplicará a la solicitud.
 * @param {string} idUsuarioResolutor - Identificador UUID del usuario administrador que resuelve la incidencia.
 * @returns {Promise<any>} Promesa con la respuesta de la operación.
 * @throws {Error} Lanza un error si falla la actualización de la solicitud.
 */
export const resolverCorreccion = async (
  idCorreccion: string,
  nuevoEstado: "Aprobada" | "Rechazada",
  idUsuarioResolutor: string,
  firmaResolutor: string,
): Promise<any> => {
  try {
    const response = await api.put<any>(
      `/api/correcciones/${idCorreccion}/resolver`,
      { firma_resolutor: firmaResolutor },
      {
        params: {
          nuevo_estado: nuevoEstado,
          resolutor_usuario_id: idUsuarioResolutor,
        },
      },
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al resolver la solicitud de corrección ${idCorreccion}.`,
    );
  }
};

/**
 * Restaura una incidencia y su fichaje afectado de vuelta al estado pendiente original.
 * URI: PUT /api/correcciones/{idCorreccion}/restaurar-pendiente
 *
 * @async
 * @function restaurarCorreccionPendiente
 * @param {string} idCorreccion - Identificador UUID único de la solicitud de corrección.
 * @returns {Promise<any>} Promesa con la respuesta de la operación.
 * @throws {Error} Lanza un error si falla la restauración de la corrección.
 */
export const restaurarCorreccionPendiente = async (
  idCorreccion: string,
): Promise<any> => {
  try {
    const response = await api.put<any>(
      `/api/correcciones/${idCorreccion}/restaurar-pendiente`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al restaurar la corrección ${idCorreccion} a estado pendiente.`,
    );
  }
};

/**
 * Elimina de forma definitiva un registro de solicitud de corrección por su identificador único.
 * URI: DELETE /api/correcciones/{idCorreccion}
 *
 * @async
 * @function eliminarCorreccion
 * @param {string} idCorreccion - Identificador UUID único de la solicitud de corrección a eliminar.
 * @returns {Promise<void>} Promesa que se resuelve al completar el borrado.
 * @throws {Error} Lanza un error si la corrección no existe o falla la operación.
 */
export const eliminarCorreccion = async (
  idCorreccion: string,
): Promise<void> => {
  try {
    await api.delete(`/api/correcciones/${idCorreccion}`);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al eliminar la solicitud de corrección ${idCorreccion}.`,
    );
  }
};
