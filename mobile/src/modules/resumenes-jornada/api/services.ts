import api from "../../../service/api/api";
import { ResumenJornada, ResumenJornadaCreate } from "../types/resumen-jornada";

/**
 * Servicio de Gestión de Resúmenes de Jornada.
 * Contiene todas las operaciones CRUD y lógicas de negocio para el registro, cálculo acumulado, consulta de cuadros de mando y cierre de jornadas laborales.
 */

/**
 * Obtiene el histórico completo de resúmenes de jornada del sistema (filtrado por tenant en el backend).
 * URI: GET /api/resumenes-jornada
 *
 * @async
 * @function obtenerResumenesJornada
 * @returns {Promise<ResumenJornada[]>} Promesa con el listado completo de resúmenes de jornada.
 * @throws {Error} Lanza un error si ocurre un fallo al recuperar los registros.
 */
export const obtenerResumenesJornada = async (): Promise<ResumenJornada[]> => {
  try {
    const respuesta = await api.get<ResumenJornada[]>("/api/resumenes-jornada");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(
      apiMessage || "Error al recuperar los resúmenes de jornada.",
    );
  }
};

/**
 * Obtiene los resúmenes de jornada asociados a un trabajador específico mediante su UUID.
 * URI: GET /api/resumenes-jornada/trabajador/{id_trabajador}
 *
 * @async
 * @function obtenerResumenesPorTrabajador
 * @param {string} idTrabajador - Identificador único universal (UUID) del trabajador.
 * @returns {Promise<ResumenJornada[]>} Promesa con el listado de resúmenes de jornada del trabajador.
 * @throws {Error} Lanza un error si el trabajador no existe o falla la recuperación.
 */
export const obtenerResumenesPorTrabajador = async (
  idTrabajador: string,
): Promise<ResumenJornada[]> => {
  try {
    const respuesta = await api.get<ResumenJornada[]>(
      `/api/resumenes-jornada/trabajador/${idTrabajador}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(
      apiMessage ||
        "Error al recuperar los resúmenes de jornada del trabajador.",
    );
  }
};

/**
 * Obtiene el cuadro de mandos diario de una empresa para una fecha concreta (AAAA-MM-DD).
 * URI: GET /api/resumenes-jornada/empresa/{id_empresa}/fecha/{fecha_dia}
 *
 * @async
 * @function obtenerCuadroMandosDiarioEmpresa
 * @param {string} idEmpresa - Identificador único universal (UUID) de la empresa.
 * @param {string} fechaDia - Fecha consultada en formato "AAAA-MM-DD".
 * @returns {Promise<ResumenJornada[]>} Promesa con el cuadro de mandos diario de la empresa.
 * @throws {Error} Lanza un error si la consulta no se puede completar.
 */
export const obtenerCuadroMandosDiarioEmpresa = async (
  idEmpresa: string,
  fechaDia: string,
): Promise<ResumenJornada[]> => {
  try {
    const respuesta = await api.get<ResumenJornada[]>(
      `/api/resumenes-jornada/empresa/${idEmpresa}/fecha/${fechaDia}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(
      apiMessage ||
        "Error al recuperar el cuadro de mandos diario de la empresa.",
    );
  }
};

/**
 * Registra o actualiza el cálculo acumulado diario de la jornada de un operario.
 * URI: POST /api/resumenes-jornada
 *
 * @async
 * @function crearOActualizarResumen
 * @param {ResumenJornadaCreate} payload - Objeto con los datos del resumen de jornada a registrar o actualizar.
 * @returns {Promise<ResumenJornada>} Promesa con el resumen de jornada guardado o actualizado.
 * @throws {Error} Lanza un error si los datos no son válidos o falla la operación.
 */
export const crearOActualizarResumen = async (
  payload: ResumenJornadaCreate,
): Promise<ResumenJornada> => {
  try {
    const respuesta = await api.post<ResumenJornada>(
      "/api/resumenes-jornada",
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(
      apiMessage || "Error al registrar o actualizar el resumen de jornada.",
    );
  }
};

/**
 * Consolida de manera definitiva (cierra) una fila diaria de resumen de jornada.
 * URI: PUT /api/resumenes-jornada/{id_resumen}/cerrar
 *
 * @async
 * @function consolidarJornadaMensual
 * @param {string} idResumen - Identificador único universal (UUID) del resumen de jornada a cerrar.
 * @returns {Promise<ResumenJornada>} Promesa con el resumen de jornada consolidado.
 * @throws {Error} Lanza un error si el registro no existe o la API rechaza el cierre.
 */
export const consolidarJornadaMensual = async (
  idResumen: string,
): Promise<ResumenJornada> => {
  try {
    const respuesta = await api.put<ResumenJornada>(
      `/api/resumenes-jornada/${idResumen}/cerrar`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(apiMessage || "Error al consolidar la jornada.");
  }
};
