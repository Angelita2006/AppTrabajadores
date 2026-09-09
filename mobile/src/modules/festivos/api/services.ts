import api from "../../../service/api/api";
import { Festivo, FestivoCreate, FestivoUpdate } from "../types/festivo";

/**
 * Servicio de Gestión de Días Festivos y Calendarios Laborales.
 * Contiene todas las operaciones CRUD y lógicas de negocio para la consulta, registro, actualización y eliminación de días no laborables en la plataforma SaaS.
 */

/**
 * Devuelve la lista global de días festivos aplicando aislamiento multi-tenant a través del calendario laboral.
 * URI: GET /api/festivos
 *
 * @async
 * @function obtenerTodosLosFestivos
 * @returns {Promise<Festivo[]>} Promesa con el listado completo de días festivos.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener todos los festivos.
 */
export const obtenerTodosLosFestivos = async (): Promise<Festivo[]> => {
  try {
    const response = await api.get<Festivo[]>("/api/festivos");
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al obtener todos los festivos.");
  }
};

/**
 * Recupera de forma ordenada el catálogo de días no laborables asignados a un calendario específico.
 * URI: GET /api/festivos/calendario/{id_calendario}
 *
 * @async
 * @function obtenerFestivosPorCalendario
 * @param {string} idCalendario - Identificador UUID único del calendario laboral.
 * @returns {Promise<Festivo[]>} Promesa con el listado de festivos asociados al calendario.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener los festivos del calendario.
 */
export const obtenerFestivosPorCalendario = async (
  idCalendario: string,
): Promise<Festivo[]> => {
  try {
    const response = await api.get<Festivo[]>(
      `/api/festivos/calendario/${idCalendario}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Error al obtener los festivos del calendario.`,
    );
  }
};

/**
 * Registra un nuevo día festivo en el backend.
 * URI: POST /api/festivos
 *
 * @async
 * @function crearFestivo
 * @param {FestivoCreate} payload - Objeto con los datos necesarios para registrar el nuevo festivo.
 * @returns {Promise<Festivo>} Promesa con el día festivo recién creado.
 * @throws {Error} Lanza un error si los datos no son válidos o falla el registro.
 */
export const crearFestivo = async (
  payload: FestivoCreate,
): Promise<Festivo> => {
  try {
    const response = await api.post<Festivo>("/api/festivos", payload);
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al crear el día festivo en el servidor.",
    );
  }
};

/**
 * Modifica un festivo existente mediante parámetros en la URL (Query Params).
 * URI: PUT /api/festivos/{id_festivo}/editar
 *
 * @async
 * @function editarFestivo
 * @param {string} idFestivo - Identificador UUID único del festivo a editar.
 * @param {FestivoUpdate} params - Objeto con los campos opcionales a modificar (fecha, tipo, descripción).
 * @returns {Promise<Festivo>} Promesa con el día festivo actualizado.
 * @throws {Error} Lanza un error si el registro no existe o la API rechaza la actualización.
 */
export const editarFestivo = async (
  idFestivo: string,
  params: FestivoUpdate,
): Promise<Festivo> => {
  try {
    const response = await api.put<Festivo>(
      `/api/festivos/${idFestivo}/editar`,
      null,
      {
        params: {
          nueva_fecha: params.fecha,
          nuevo_tipo: params.tipo,
          nueva_descripcion: params.descripcion,
        },
      },
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al editar el festivo en el servidor.");
  }
};

/**
 * Elimina un día festivo del calendario laboral de forma definitiva.
 * URI: DELETE /api/festivos/{id_festivo}
 *
 * @async
 * @function eliminarFestivo
 * @param {string} idFestivo - Identificador UUID único del festivo a eliminar.
 * @returns {Promise<{ detail: string }>} Promesa con el mensaje de confirmación de la eliminación.
 * @throws {Error} Lanza un error si el festivo no se encuentra o falla la operación.
 */
export const eliminarFestivo = async (
  idFestivo: string,
): Promise<{ detail: string }> => {
  try {
    const response = await api.delete<{ detail: string }>(
      `/api/festivos/${idFestivo}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al eliminar el día festivo.");
  }
};
