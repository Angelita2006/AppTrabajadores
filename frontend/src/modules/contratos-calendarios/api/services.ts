import api from "@/src/service/api/api";
import { ContratoCalendarioCreate, ContratoCalendarioResponse, ContratoCalendarioUpdate } from "../types/contrato-calendario";

/**
 * Servicio de calendarios asociados a contratos.
 * Permite consultar, vincular, modificar y retirar las relaciones de calendario.
 */

/**
 * Lista las relaciones de calendario asociadas a un contrato.
 * URI: GET /api/contratos-calendarios/contrato/{id_contrato}
 * @async
 * @function obtenerCalendariosContrato
 * @param {string} idContrato - Identificador del contrato.
 * @returns {Promise<ContratoCalendarioResponse[]>} Relaciones de calendario del contrato.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerCalendariosContrato = async (idContrato: string): Promise<ContratoCalendarioResponse[]> => {
  try {
    return (await api.get<ContratoCalendarioResponse[]>(`/api/contratos-calendarios/contrato/${idContrato}`)).data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener los calendarios del contrato.");
  }
};

/**
 * Lista las relaciones de calendarios de los contratos de una empresa.
 * URI: GET /api/contratos-calendarios/empresa/{id_empresa}
 * @async
 * @function obtenerRelacionesCalendarioEmpresa
 * @param {string} idEmpresa - Identificador de la empresa.
 * @returns {Promise<ContratoCalendarioResponse[]>} Relaciones de calendario de la empresa.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerRelacionesCalendarioEmpresa = async (idEmpresa: string): Promise<ContratoCalendarioResponse[]> => {
  try {
    return (await api.get<ContratoCalendarioResponse[]>(`/api/contratos-calendarios/empresa/${idEmpresa}`)).data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener las relaciones de calendario de la empresa.");
  }
};

/**
 * Obtiene una relación de calendario por su identificador.
 * URI: GET /api/contratos-calendarios/{id_relacion}
 * @async
 * @function obtenerContratoCalendario
 * @param {string} idRelacion - Identificador de la relación.
 * @returns {Promise<ContratoCalendarioResponse>} Relación de contrato y calendario.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerContratoCalendario = async (idRelacion: string): Promise<ContratoCalendarioResponse> => {
  try {
    return (await api.get<ContratoCalendarioResponse>(`/api/contratos-calendarios/${idRelacion}`)).data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener la relación de calendario.");
  }
};

/**
 * Asocia un calendario laboral a un contrato.
 * URI: POST /api/contratos-calendarios
 * @async
 * @function crearContratoCalendario
 * @param {ContratoCalendarioCreate} payload - Identificadores de contrato y calendario.
 * @returns {Promise<ContratoCalendarioResponse>} Relación creada.
 * @throws {Error} Mensaje de la API o error genérico de creación.
 */
export const crearContratoCalendario = async (payload: ContratoCalendarioCreate): Promise<ContratoCalendarioResponse> => {
  try {
    return (await api.post<ContratoCalendarioResponse>("/api/contratos-calendarios", payload)).data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al asociar el calendario al contrato.");
  }
};

/**
 * Actualiza una relación de calendario asociada a un contrato.
 * URI: PATCH /api/contratos-calendarios/{id_relacion}
 * @async
 * @function modificarContratoCalendario
 * @param {string} idRelacion - Identificador de la relación.
 * @param {ContratoCalendarioUpdate} payload - Campos que se actualizarán.
 * @returns {Promise<ContratoCalendarioResponse>} Relación actualizada.
 * @throws {Error} Mensaje de la API o error genérico de modificación.
 */
export const modificarContratoCalendario = async (idRelacion: string, payload: ContratoCalendarioUpdate): Promise<ContratoCalendarioResponse> => {
  try {
    return (await api.patch<ContratoCalendarioResponse>(`/api/contratos-calendarios/${idRelacion}`, payload)).data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al modificar la relación de calendario.");
  }
};

/**
 * Elimina la asociación entre un contrato y un calendario laboral.
 * URI: DELETE /api/contratos-calendarios/{id_relacion}
 * @async
 * @function desactivarContratoCalendario
 * @param {string} idRelacion - Identificador de la relación.
 * @returns {Promise<void>} No devuelve contenido si se elimina correctamente.
 * @throws {Error} Mensaje de la API o error genérico de eliminación.
 */
export const desactivarContratoCalendario = async (idRelacion: string): Promise<void> => {
  try {
    await api.delete(`/api/contratos-calendarios/${idRelacion}`);
  } catch (error: any) {
    throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al eliminar la relación contrato-calendario.");
  }
};
