import api from "../../../service/api/api";
import {
  ResumenJornada,
  ResumenJornadaResponse,
} from "../types/resumen-jornada";

/**
 * Servicio de Gestión de Resúmenes de Jornada.
 * Consulta y consolida los resúmenes diarios de jornada devueltos por la API.
 */

/**
 * Convierte la respuesta de la API al modelo utilizado por las pantallas.
 * El schema actual de Pydantic no incluye `fecha`, así que se deriva de `hora_entrada`.
 */
const convertirResumenJornada = (
  resumen: ResumenJornadaResponse,
  fecha?: string,
): ResumenJornada => ({
  ...resumen,
  fecha: fecha || resumen.hora_entrada.slice(0, 10),
});

/**
 * Obtiene el historial de resúmenes de jornada de un trabajador.
 * URI: GET /api/resumenes-jornada/trabajador/{id_trabajador}
 *
 * @async
 * @function obtenerResumenesJornada
 * @param {string} idTrabajador - Identificador UUID del trabajador.
 * @returns {Promise<ResumenJornada[]>} Resúmenes del trabajador.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerResumenesJornada = async (
  idTrabajador: string,
): Promise<ResumenJornada[]> => {
  try {
    const respuesta = await api.get<ResumenJornadaResponse[]>(
      `/api/resumenes-jornada/trabajador/${idTrabajador}`,
    );
    return respuesta.data.map((resumen) => convertirResumenJornada(resumen));
  } catch (error: any) {
    const mensaje = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(mensaje || "Error al recuperar los resúmenes de jornada.");
  }
};

/**
 * Obtiene los resúmenes de jornada de un trabajador concreto.
 * URI: GET /api/resumenes-jornada/trabajador/{id_trabajador}
 *
 * @async
 * @function obtenerResumenesPorTrabajador
 * @param {string} idTrabajador - Identificador UUID del trabajador.
 * @returns {Promise<ResumenJornada[]>} Resúmenes del trabajador.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerResumenesPorTrabajador = async (
  idTrabajador: string,
): Promise<ResumenJornada[]> => obtenerResumenesJornada(idTrabajador);

/**
 * Obtiene el cuadro diario de jornada de una empresa para una fecha concreta.
 * URI: GET /api/resumenes-jornada/empresa/{id_empresa}/fecha/{fecha_dia}
 *
 * @async
 * @function obtenerCuadroMandosDiarioEmpresa
 * @param {string} idEmpresa - Identificador UUID de la empresa.
 * @param {string} fechaDia - Fecha consultada en formato YYYY-MM-DD.
 * @param {string} empresaIdContext - Empresa activa usada por el interceptor de la API.
 * @returns {Promise<ResumenJornada[]>} Resúmenes diarios de la empresa.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerCuadroMandosDiarioEmpresa = async (
  idEmpresa: string,
  fechaDia: string,
  empresaIdContext: string = idEmpresa,
): Promise<ResumenJornada[]> => {
  try {
    const respuesta = await api.get<ResumenJornadaResponse[]>(
      `/api/resumenes-jornada/empresa/${idEmpresa}/fecha/${fechaDia}`,
      { empresaIdContext } as any,
    );
    return respuesta.data.map((resumen) =>
      convertirResumenJornada(resumen, fechaDia),
    );
  } catch (error: any) {
    const mensaje = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(
      mensaje || "Error al recuperar el cuadro de mandos diario de la empresa.",
    );
  }
};

/**
 * Consolida y cierra un resumen diario de jornada.
 * URI: PUT /api/resumenes-jornada/{id_resumen}/cerrar
 *
 * @async
 * @function consolidarJornadaMensual
 * @param {string} idResumen - Identificador UUID del resumen que se va a cerrar.
 * @returns {Promise<ResumenJornada>} Resumen consolidado.
 * @throws {Error} Mensaje de la API o error genérico de cierre.
 */
export const consolidarJornadaMensual = async (
  idResumen: string,
): Promise<ResumenJornada> => {
  try {
    const respuesta = await api.put<ResumenJornadaResponse>(
      `/api/resumenes-jornada/${idResumen}/cerrar`,
    );
    return convertirResumenJornada(respuesta.data);
  } catch (error: any) {
    const mensaje = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(mensaje || "Error al consolidar la jornada.");
  }
};
