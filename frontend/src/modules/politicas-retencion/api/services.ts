import api from "@/src/service/api/api";
import { PoliticaRetencionCreate, PoliticaRetencionResponse } from "../types/politica-retencion";

/**
 * Servicio de políticas de conservación de registros.
 * Consulta políticas globales o empresariales y permite configurar las políticas propias.
 */

/**
 * Obtiene la política global de conservación.
 * URI: GET /api/politicas-retencion/global
 * @async
 * @function obtenerPoliticaGlobal
 * @returns {Promise<PoliticaRetencionResponse>} Política global configurada.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerPoliticaGlobal = async (): Promise<PoliticaRetencionResponse> => {
  try { return (await api.get<PoliticaRetencionResponse>("/api/politicas-retencion/global")).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener la política global de conservación."); }
};

/**
 * Obtiene las políticas de conservación de una empresa.
 * URI: GET /api/politicas-retencion/empresa/{id_empresa}
 * @async
 * @function obtenerPoliticasEmpresa
 * @param {string} idEmpresa - Identificador de la empresa.
 * @returns {Promise<PoliticaRetencionResponse[]>} Políticas configuradas para la empresa.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerPoliticasEmpresa = async (idEmpresa: string): Promise<PoliticaRetencionResponse[]> => {
  try { return (await api.get<PoliticaRetencionResponse[]>(`/api/politicas-retencion/empresa/${idEmpresa}`)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener las políticas de conservación de la empresa."); }
};

/**
 * Crea una política de conservación para una empresa.
 * URI: POST /api/politicas-retencion
 * @async
 * @function crearPoliticaRetencion
 * @param {PoliticaRetencionCreate} payload - Años de conservación, acción y empresa.
 * @returns {Promise<PoliticaRetencionResponse>} Política creada.
 * @throws {Error} Mensaje de la API o error genérico de creación.
 */
export const crearPoliticaRetencion = async (payload: PoliticaRetencionCreate): Promise<PoliticaRetencionResponse> => {
  try { return (await api.post<PoliticaRetencionResponse>("/api/politicas-retencion", payload)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al crear la política de conservación."); }
};

/**
 * Cambia el periodo de conservación de una política existente.
 * URI: PUT /api/politicas-retencion/{id_politica}?nuevos_anios={nuevos_anios}
 * @async
 * @function modificarAniosRetencion
 * @param {string} idPolitica - Identificador de la política.
 * @param {number} nuevosAnios - Nuevo periodo de conservación en años.
 * @returns {Promise<PoliticaRetencionResponse>} Política actualizada.
 * @throws {Error} Mensaje de la API o error genérico de modificación.
 */
export const modificarAniosRetencion = async (idPolitica: string, nuevosAnios: number): Promise<PoliticaRetencionResponse> => {
  try { return (await api.put<PoliticaRetencionResponse>(`/api/politicas-retencion/${idPolitica}`, null, { params: { nuevos_anios: nuevosAnios } })).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al modificar el periodo de conservación."); }
};
