import api from "../../../service/api/api";
import { FichajeCreateParams, RegistroFichaje } from "../types/registrofichaje";

/**
 * Servicio de Gestión de Fichajes y Marcajes Laborales.
 * Contiene todas las operaciones CRUD y lógicas de negocio para el registro inmutable, consultas históricas, turnos y control de presencia en la plataforma SaaS.
 */

/**
 * Obtiene el historial global de fichajes registrados de la plataforma (filtrado por tenant en el backend).
 * URI: GET /api/fichajes
 *
 * @async
 * @function obtenerFichajes
 * @returns {Promise<RegistroFichaje[]>} Promesa con el listado completo de fichajes.
 * @throws {Error} Lanza un error si ocurre un fallo al recuperar el historial de fichajes.
 */
export const obtenerFichajes = async (): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>("/api/fichajes");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al recuperar el historial de fichajes.",
    );
  }
};

/**
 * Recupera el historial completo de marcajes para un trabajador y organización particulares.
 * URI: GET /api/fichajes/trabajador/{id_trabajador}/empresa/{id_empresa}
 *
 * @async
 * @function obtenerFichajesTrabajadorYEmpresa
 * @param {string} idTrabajador - Identificador UUID único del trabajador.
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @returns {Promise<RegistroFichaje[]>} Promesa con el listado de fichajes del trabajador en la empresa.
 * @throws {Error} Lanza un error si la consulta falla o no se encuentran los registros.
 */
export const obtenerFichajesTrabajadorYEmpresa = async (
  idTrabajador: string,
  idEmpresa: string,
): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>(
      `/api/fichajes/trabajador/${idTrabajador}/empresa/${idEmpresa}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al recuperar los fichajes del trabajador.",
    );
  }
};

/**
 * Descarga todos los marcajes del día actual para un trabajador.
 * URI: GET /api/fichajes/trabajador/{trabajador_id}/hoy
 *
 * @async
 * @function obtenerFichajesHoy
 * @param {string} idTrabajador - Identificador UUID único del trabajador.
 * @returns {Promise<RegistroFichaje[]>} Promesa con los fichajes del día actual.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener los fichajes de hoy.
 */
export const obtenerFichajesHoy = async (
  idTrabajador: string,
): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>(
      `/api/fichajes/trabajador/${idTrabajador}/hoy`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al obtener los fichajes de hoy.");
  }
};

/**
 * Recupera el historial de la semana actual del trabajador.
 * URI: GET /api/fichajes/trabajador/{id_trabajador}/semana
 *
 * @async
 * @function obtenerFichajesSemanaActual
 * @param {string} idTrabajador - Identificador UUID único del trabajador.
 * @returns {Promise<RegistroFichaje[]>} Promesa con el listado de fichajes de la semana actual.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener los fichajes de la semana.
 */
export const obtenerFichajesSemanaActual = async (
  idTrabajador: string,
): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>(
      `/api/fichajes/trabajador/${idTrabajador}/semana`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener los fichajes de la semana.",
    );
  }
};

/**
 * Recupera el historial de fichajes dentro del turno actual del trabajador.
 * URI: GET /api/fichajes/trabajador/{id_trabajador}/turno
 *
 * @async
 * @function obtenerFichajesTurnoActual
 * @param {string} idTrabajador - Identificador UUID único del trabajador.
 * @returns {Promise<RegistroFichaje[]>} Promesa con los fichajes del turno actual.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener los fichajes del turno actual.
 */
export const obtenerFichajesTurnoActual = async (
  idTrabajador: string,
): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>(
      `/api/fichajes/trabajador/${idTrabajador}/turno`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener los fichajes del turno actual.",
    );
  }
};

/**
 * Descarga de forma eficiente el marcaje más reciente del operario.
 * URI: GET /api/fichajes/trabajador/{trabajador_id}/ultimo
 *
 * @async
 * @function obtenerUltimoFichaje
 * @param {string} idTrabajador - Identificador UUID único del trabajador.
 * @returns {Promise<RegistroFichaje>} Promesa con el último registro de fichaje.
 * @throws {Error} Lanza un error si ocurre un fallo al consultar el último fichaje.
 */
export const obtenerUltimoFichaje = async (
  idTrabajador: string,
): Promise<RegistroFichaje> => {
  try {
    const respuesta = await api.get<RegistroFichaje>(
      `/api/fichajes/trabajador/${idTrabajador}/ultimo`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al consultar el último fichaje.");
  }
};

/**
 * Recupera el historial consolidado de marcajes de toda la plantilla para una fecha concreta.
 * URI: GET /api/fichajes/empresa/{empresa_id}
 *
 * @async
 * @function obtenerFichajesEmpresaPorFecha
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @param {string} fechaStr - Fecha consultada en formato de cadena (ej. AAAA-MM-DD).
 * @returns {Promise<RegistroFichaje[]>} Promesa con el listado de fichajes de la empresa en la fecha indicada.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener los fichajes de la empresa por fecha.
 */
export const obtenerFichajesEmpresaPorFecha = async (
  idEmpresa: string,
  fechaStr: string,
): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>(
      `/api/fichajes/empresa/${idEmpresa}`,
      {
        params: { fecha: fechaStr },
      },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener los fichajes de la empresa por fecha.",
    );
  }
};

/**
 * Envía un marcaje horario inmutable hacia la tabla 'fichajes' de PostgreSQL.
 * URI: POST /api/fichajes
 *
 * @async
 * @function registrarFichaje
 * @param {FichajeCreateParams} payload - Objeto con los parámetros necesarios para registrar el nuevo fichaje.
 * @returns {Promise<RegistroFichaje>} Promesa con el registro de fichaje recién creado.
 * @throws {Error} Lanza un error si los datos no son válidos o la API rechaza el registro.
 */
export const registrarFichaje = async (
  payload: FichajeCreateParams,
): Promise<RegistroFichaje> => {
  try {
    const respuesta = await api.post<RegistroFichaje>("/api/fichajes", payload);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al registrar el fichaje en el sistema.",
    );
  }
};
