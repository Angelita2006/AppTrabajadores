import api from "@/src/service/api/api";
import { Festivo } from "../../festivos/types/festivo";
import {
  CalendarioFestivo,
  CalendarioLaboralCreate,
  CalendarioLaboralResponse,
  CalendarioLaboralUpdate,
} from "../types/calendario";

/**
 * Registra un nuevo calendario laboral en el sistema.
 * URI: POST /api/calendarios-laborales
 *
 * @async
 * @function crearCalendarioLaboral
 * @param {CalendarioLaboralCreate} payload - Objeto con los datos requeridos para dar de alta el calendario laboral.
 * @returns {Promise<CalendarioLaboralResponse>} Promesa con el objeto `CalendarioLaboralResponse` recién creado.
 * @throws {Error} Lanza un error si falla la creación o existen inconsistencias en los datos proporcionados.
 */
export const crearCalendarioLaboral = async (
  payload: CalendarioLaboralCreate,
): Promise<CalendarioLaboralResponse> => {
  try {
    const response = await api.post<CalendarioLaboralResponse>(
      "/api/calendarios-laborales",
      payload,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al registrar el nuevo calendario laboral.",
    );
  }
};

/**
 * Recupera un calendario laboral específico mediante su identificador único junto con sus festivos anidados.
 * URI: GET /api/calendarios-laborales/{idCalendario}
 *
 * @async
 * @function obtenerCalendarioLaboral
 * @param {string} idCalendario - Identificador UUID único del calendario laboral.
 * @returns {Promise<CalendarioFestivo>} Promesa con la entidad `CalendarioFestivo` encontrada.
 * @throws {Error} Lanza un error si el calendario no existe o falla la consulta.
 */
export const obtenerCalendarioLaboral = async (
  idCalendario: string,
): Promise<CalendarioFestivo> => {
  try {
    const response = await api.get<CalendarioFestivo>(
      `/api/calendarios-laborales/${idCalendario}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Calendario laboral con ID ${idCalendario} no encontrado.`,
    );
  }
};

/**
 * Recupera los calendarios anuales de una empresa u organización específica junto con el listado de sus días festivos.
 * URI: GET /api/calendarios-laborales/empresa/{idEmpresa}/con-festivos
 *
 * @async
 * @function obtenerCalendariosFestivosPorEmpresa
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @returns {Promise<CalendarioFestivo[]>} Promesa con la lista de calendarios y sus festivos vinculados a la empresa.
 * @throws {Error} Lanza un error si falla la recuperación de los datos.
 */
export const obtenerCalendariosFestivosPorEmpresa = async (
  idEmpresa: string,
): Promise<CalendarioFestivo[]> => {
  try {
    const response = await api.get<CalendarioFestivo[]>(
      `/api/calendarios-laborales/empresa/${idEmpresa}/con-festivos`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al recuperar los calendarios y festivos de la empresa ${idEmpresa}.`,
    );
  }
};

/**
 * Actualiza parcialmente los atributos de un calendario laboral existente mediante su identificador único.
 * URI: PUT /api/calendarios-laborales/{idCalendario}
 *
 * @async
 * @function actualizarCalendarioLaboral
 * @param {string} idCalendario - Identificador UUID único del calendario laboral a modificar.
 * @param {CalendarioLaboralUpdate} payload - Objeto con los parámetros opcionales a actualizar.
 * @returns {Promise<CalendarioLaboralResponse>} Promesa con la entidad `CalendarioLaboralResponse` actualizada.
 * @throws {Error} Lanza un error si el calendario no existe o la actualización es rechazada.
 */
export const actualizarCalendarioLaboral = async (
  idCalendario: string,
  payload: CalendarioLaboralUpdate,
): Promise<CalendarioLaboralResponse> => {
  try {
    const response = await api.put<CalendarioLaboralResponse>(
      `/api/calendarios-laborales/${idCalendario}`,
      payload,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al actualizar el calendario laboral ${idCalendario}.`,
    );
  }
};

/**
 * Envía un archivo binario PDF al servidor para ser analizado mediante IA y extraer los festivos del calendario.
 * URI: POST /api/calendarios-laborales/{idCalendario}/importar-pdf
 *
 * @async
 * @function importarCalendarioPDF
 * @param {string} idCalendario - Identificador UUID único del calendario laboral de destino.
 * @param {FormData} formData - Objeto FormData conteniendo el archivo PDF binario.
 * @returns {Promise<{ status: string; total_importados: number; festivos: Festivo[] }>} Promesa con el resultado de la importación y los festivos procesados.
 * @throws {Error} Lanza un error si el procesamiento del PDF falla en el servidor.
 */
export const importarCalendarioPDF = async (
  idCalendario: string,
  formData: FormData,
): Promise<{
  status: string;
  total_importados: number;
  festivos: Festivo[];
}> => {
  try {
    const response = await api.post(
      `/api/calendarios-laborales/${idCalendario}/importar-pdf`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 45000,
      },
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        "Error al procesar y guardar el archivo PDF del calendario.",
    );
  }
};

/**
 * Elimina de forma definitiva un calendario laboral por su identificador único.
 * URI: DELETE /api/calendarios-laborales/{idCalendario}
 *
 * @async
 * @function eliminarCalendarioLaboral
 * @param {string} idCalendario - Identificador UUID único del calendario a eliminar.
 * @returns {Promise<void>} Promesa que se resuelve al completar la eliminación.
 * @throws {Error} Lanza un error si el calendario no existe o falla la operación.
 */
export const eliminarCalendarioLaboral = async (
  idCalendario: string,
): Promise<void> => {
  try {
    await api.delete(`/api/calendarios-laborales/${idCalendario}`);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Error al eliminar el calendario laboral ${idCalendario}.`,
    );
  }
};
