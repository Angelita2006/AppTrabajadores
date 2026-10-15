import api from "@/src/service/api/api";
import { MotivoPausaCreate, MotivoPausaResponse } from "../types/motivo-pausa";

/**
 * Servicio del catálogo de motivos de pausa.
 * Recupera los motivos configurados para una empresa y permite crear nuevos.
 */

/**
 * Obtiene los motivos de pausa configurados para una empresa.
 * URI: GET /api/motivos-pausa/empresa/{id_empresa}
 * @async
 * @function obtenerMotivosDisponiblesEmpresa
 * @param {string} idEmpresa - Identificador de la empresa.
 * @returns {Promise<MotivoPausaResponse[]>} Motivos disponibles en la empresa.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerMotivosDisponiblesEmpresa = async (idEmpresa: string): Promise<MotivoPausaResponse[]> => {
  try { return (await api.get<MotivoPausaResponse[]>(`/api/motivos-pausa/empresa/${idEmpresa}`)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener los motivos de pausa de la empresa."); }
};

/**
 * Obtiene un motivo de pausa por su identificador.
 * URI: GET /api/motivos-pausa/{id_motivo}
 * @async
 * @function obtenerMotivoPausa
 * @param {string} idMotivo - Identificador del motivo.
 * @returns {Promise<MotivoPausaResponse>} Motivo de pausa solicitado.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerMotivoPausa = async (idMotivo: string): Promise<MotivoPausaResponse> => {
  try { return (await api.get<MotivoPausaResponse>(`/api/motivos-pausa/${idMotivo}`)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener el motivo de pausa."); }
};

/**
 * Crea un motivo de pausa para una empresa.
 * URI: POST /api/motivos-pausa
 * @async
 * @function crearMotivoPausa
 * @param {MotivoPausaCreate} payload - Datos del motivo y empresa propietaria.
 * @returns {Promise<MotivoPausaResponse>} Motivo de pausa creado.
 * @throws {Error} Mensaje de la API o error genérico de creación.
 */
export const crearMotivoPausa = async (payload: MotivoPausaCreate): Promise<MotivoPausaResponse> => {
  try { return (await api.post<MotivoPausaResponse>("/api/motivos-pausa", payload)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al crear el motivo de pausa."); }
};
