import api from "@/src/service/api/api";
import {
  PoliticaRetencionCreate,
  PoliticaRetencionResponse,
} from "../types/politica-retencion";

/**
 * Servicio de políticas de conservación de registros.
 * Consulta políticas globales o empresariales y permite configurar políticas propias.
 */

/**
 * Obtiene la política global de conservación.
 * URI: GET /api/politicas-retencion/global
 *
 * @async
 * @function obtenerPoliticaGlobal
 * @returns {Promise<PoliticaRetencionResponse | null>} Política global, o null si la API devuelve una respuesta vacía.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerPoliticaGlobal = async (): Promise<
  PoliticaRetencionResponse | null
> => {
  try {
    const respuesta = await api.get<PoliticaRetencionResponse | null>(
      "/api/politicas-retencion/global",
    );
    return respuesta.data;
  } catch (error: any) {
    const mensaje = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(mensaje || "Error al obtener la política global de conservación.");
  }
};

/**
 * Obtiene la política aplicable a una empresa, incluida la global si no tiene una propia.
 * URI: GET /api/politicas-retencion/empresa/{id_empresa}
 *
 * @async
 * @function obtenerPoliticasEmpresa
 * @param {string} idEmpresa - Identificador de la empresa.
 * @returns {Promise<PoliticaRetencionResponse>} Política aplicable a la empresa.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerPoliticasEmpresa = async (
  idEmpresa: string,
): Promise<PoliticaRetencionResponse> => {
  try {
    const respuesta = await api.get<PoliticaRetencionResponse>(
      `/api/politicas-retencion/empresa/${idEmpresa}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const mensaje = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(
      mensaje || "Error al obtener la política de conservación de la empresa.",
    );
  }
};

/** Alias singular para expresar que el endpoint devuelve una sola política. */
export const obtenerPoliticaEmpresa = obtenerPoliticasEmpresa;

/**
 * Crea una política de conservación para una empresa.
 * URI: POST /api/politicas-retencion
 *
 * @async
 * @function crearPoliticaRetencion
 * @param {PoliticaRetencionCreate} payload - Años, acción de retención y empresa.
 * @returns {Promise<PoliticaRetencionResponse>} Política creada.
 * @throws {Error} Mensaje de la API o error genérico de creación.
 */
export const crearPoliticaRetencion = async (
  payload: PoliticaRetencionCreate,
): Promise<PoliticaRetencionResponse> => {
  try {
    const respuesta = await api.post<PoliticaRetencionResponse>(
      "/api/politicas-retencion",
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    const mensaje = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(mensaje || "Error al crear la política de conservación.");
  }
};

/**
 * Cambia los años de conservación de una política existente.
 * URI: PUT /api/politicas-retencion/{id_politica}?nuevos_anios={nuevos_anios}
 *
 * @async
 * @function modificarAniosRetencion
 * @param {string} idPolitica - Identificador de la política.
 * @param {number} nuevosAnios - Nuevo periodo de conservación en años.
 * @returns {Promise<PoliticaRetencionResponse>} Política actualizada.
 * @throws {Error} Mensaje de la API o error genérico de modificación.
 */
export const modificarAniosRetencion = async (
  idPolitica: string,
  nuevosAnios: number,
): Promise<PoliticaRetencionResponse> => {
  try {
    const respuesta = await api.put<PoliticaRetencionResponse>(
      `/api/politicas-retencion/${idPolitica}`,
      null,
      { params: { nuevos_anios: nuevosAnios } },
    );
    return respuesta.data;
  } catch (error: any) {
    const mensaje = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(mensaje || "Error al modificar el periodo de conservación.");
  }
};
