import api from "../../../service/api/api";
import { FichajeCreateParams, RegistroFichaje } from "../types/registrofichaje";

const EVENTOS_BACKEND: Record<string, string> = {
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  INICIO_PAUSA: "Inicio_pausa",
  FIN_PAUSA: "Fin_pausa",
};

function normalizarFichaje(fichaje: RegistroFichaje): RegistroFichaje {
  const evento = String(fichaje.tipo_evento);
  const tipo_evento = Object.keys(EVENTOS_BACKEND).find(
    (codigo) => EVENTOS_BACKEND[codigo] === evento,
  ) ?? evento;
  return { ...fichaje, tipo_evento: tipo_evento as RegistroFichaje["tipo_evento"] };
}

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
export const obtenerFichajes = async (idEmpresa: string): Promise<RegistroFichaje[]> => {
  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const respuesta = await api.get<RegistroFichaje[]>(`/api/fichajes/empresa/${idEmpresa}`, {
      params: { fecha_inicio: "2000-01-01", fecha_fin: hoy },
    });
    return respuesta.data.map(normalizarFichaje);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
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
    return respuesta.data.map(normalizarFichaje);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al recuperar los fichajes del trabajador.",
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
    return respuesta.data.map(normalizarFichaje);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
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
): Promise<RegistroFichaje | null> => {
  try {
    const respuesta = await api.get<RegistroFichaje | null>(
      `/api/fichajes/trabajador/${idTrabajador}/ultimo`,
    );
    return respuesta.data ? normalizarFichaje(respuesta.data) : respuesta.data;
  } catch (error: any) {
    const errorDetail = error?.response?.data?.detail;
    let mensajeLegible =
      "Error al obtener los fichajes de la empresa entre fechas.";
    if (Array.isArray(errorDetail)) {
      mensajeLegible = errorDetail
        .map((err: any) => `${err.loc.join(".")}: ${err.msg}`)
        .join(", ");
    } else if (typeof errorDetail === "string") {
      mensajeLegible = errorDetail;
    }
    throw new Error(mensajeLegible);
    // const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    // throw new Error(apiMessage || "Error al consultar el último fichaje.");
  }
};

/**
 * Recupera el historial consolidado de marcajes de toda la plantilla para entre fechas concreta.
 * URI: GET /api/fichajes/empresa/{empresa_id}
 *
 * @async
 * @function obtenerFichajesEmpresaEntreFechas
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @param {string} fechaInicio - Fecha de inicio consultada en formato de cadena (ej. AAAA-MM-DD).
 * @param {string} fechaFin - Fecha de fin consultada en formato de cadena (ej. AAAA-MM-DD).
 * @returns {Promise<RegistroFichaje[]>} Promesa con el listado de fichajes de la empresa entre las fechas indicadas.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener los fichajes de la empresa por fecha.
 */
export const obtenerFichajesEmpresaEntreFechas = async (
  idEmpresa: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>(
      `/api/fichajes/empresa/${idEmpresa}`,
      {
        params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      },
    );
    return respuesta.data.map(normalizarFichaje);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    let mensajeLegible =
      "Error al obtener los fichajes de la empresa entre fechas.";
    if (Array.isArray(apiMessage)) {
      mensajeLegible = apiMessage
        .map((err: any) => `${err.loc.join(".")}: ${err.msg}`)
        .join(", ");
    } else if (typeof apiMessage === "string") {
      mensajeLegible = apiMessage;
    }

    throw new Error(mensajeLegible);
  }
};

/**
 * Recupera el historial consolidado de marcajes de un trabajador para un período entre dos fechas concretas.
 * URI: GET /api/fichajes/trabajador/{trabajador_id}
 *
 * @async
 * @function obtenerFichajesTrabajadorEntreFechas
 * @param {string} idTrabajador - Identificador UUID único del trabajador.
 * @param {string} fechaInicio - Fecha de inicio consultada en formato de cadena (ej. AAAA-MM-DD).
 * @param {string} fechaFin - Fecha de fin consultada en formato de cadena (ej. AAAA-MM-DD).
 * @returns {Promise<RegistroFichaje[]>} Promesa con el listado de fichajes de la empresa en la fecha indicada.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener los fichajes de la empresa por fecha.
 */
export const obtenerFichajesTrabajadorEntreFechas = async (
  idTrabajador: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>(
      `/api/fichajes/trabajador/${idTrabajador}`,
      {
        params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      },
    );
    return respuesta.data.map(normalizarFichaje);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        "Error al obtener los fichajes del trabajador entre fechas.",
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
    const evento = EVENTOS_BACKEND[payload.tipo_evento] ?? payload.tipo_evento;
    const respuesta = await api.post<RegistroFichaje>("/api/fichajes", {
      ...payload,
      tipo_evento: evento,
      fecha_hora: payload.fecha_hora ?? payload.fecha_hora_dispositivo,
    });
    return normalizarFichaje(respuesta.data);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al registrar el fichaje en el sistema.",
    );
  }
};
