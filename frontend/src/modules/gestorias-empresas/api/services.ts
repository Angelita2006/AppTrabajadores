import api from "@/src/service/api/api";
import { GestoriaEmpresaCreate, GestoriaEmpresaPermisosUpdate, GestoriaEmpresaResponse, GestoriaEmpresaUpdate } from "../types/gestoria-empresa";

/**
 * Servicio de relaciones entre gestorías y empresas cliente.
 * Gestiona las autorizaciones y los permisos delegados sobre cada empresa cliente.
 */

/**
 * Lista las relaciones de gestoría visibles para el usuario actual.
 * URI: GET /api/gestorias-empresas
 * @async
 * @function obtenerAutorizacionesGestorias
 * @returns {Promise<GestoriaEmpresaResponse[]>} Relaciones de gestoría disponibles.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerAutorizacionesGestorias = async (): Promise<GestoriaEmpresaResponse[]> => {
  try { return (await api.get<GestoriaEmpresaResponse[]>("/api/gestorias-empresas")).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener las relaciones de gestoría."); }
};

/**
 * Obtiene una relación de gestoría por su identificador.
 * URI: GET /api/gestorias-empresas/{id_relacion}
 * @async
 * @function obtenerAutorizacionGestoria
 * @param {string} idRelacion - Identificador de la relación.
 * @returns {Promise<GestoriaEmpresaResponse>} Relación entre gestoría y empresa cliente.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerAutorizacionGestoria = async (idRelacion: string): Promise<GestoriaEmpresaResponse> => {
  try { return (await api.get<GestoriaEmpresaResponse>(`/api/gestorias-empresas/${idRelacion}`)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener la autorización de gestoría."); }
};

/**
 * Crea una autorización para que una gestoría gestione una empresa cliente.
 * URI: POST /api/gestorias-empresas
 * @async
 * @function crearAutorizacionGestoria
 * @param {GestoriaEmpresaCreate} payload - Empresa cliente y vigencia de la autorización.
 * @returns {Promise<GestoriaEmpresaResponse>} Autorización creada.
 * @throws {Error} Mensaje de la API o error genérico de creación.
 */
export const crearAutorizacionGestoria = async (payload: GestoriaEmpresaCreate): Promise<GestoriaEmpresaResponse> => {
  try { return (await api.post<GestoriaEmpresaResponse>("/api/gestorias-empresas", payload)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al crear la autorización de gestoría."); }
};

/**
 * Actualiza los permisos delegados por la empresa cliente.
 * URI: PUT /api/gestorias-empresas/{id_relacion}/permisos-delegados
 * @async
 * @function actualizarPermisosDelegadosCliente
 * @param {string} idRelacion - Identificador de la relación.
 * @param {GestoriaEmpresaPermisosUpdate} payload - Permisos que la gestoría podrá ejercer.
 * @returns {Promise<GestoriaEmpresaResponse>} Relación con los permisos actualizados.
 * @throws {Error} Mensaje de la API o error genérico de modificación.
 */
export const actualizarPermisosDelegadosCliente = async (idRelacion: string, payload: GestoriaEmpresaPermisosUpdate): Promise<GestoriaEmpresaResponse> => {
  try { return (await api.put<GestoriaEmpresaResponse>(`/api/gestorias-empresas/${idRelacion}/permisos-delegados`, payload)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al actualizar los permisos delegados."); }
};

/**
 * Actualiza los permisos máximos configurados para una relación de gestoría.
 * URI: PUT /api/gestorias-empresas/{id_relacion}/permisos
 * @async
 * @function actualizarPermisosGestoria
 * @param {string} idRelacion - Identificador de la relación.
 * @param {GestoriaEmpresaPermisosUpdate} payload - Permisos máximos autorizados.
 * @returns {Promise<GestoriaEmpresaResponse>} Relación actualizada.
 * @throws {Error} Mensaje de la API o error genérico de modificación.
 */
export const actualizarPermisosGestoria = async (idRelacion: string, payload: GestoriaEmpresaPermisosUpdate): Promise<GestoriaEmpresaResponse> => {
  try { return (await api.put<GestoriaEmpresaResponse>(`/api/gestorias-empresas/${idRelacion}/permisos`, payload)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al actualizar los permisos de la gestoría."); }
};

/**
 * Modifica la vigencia o el estado de una autorización de gestoría.
 * URI: PATCH /api/gestorias-empresas/{id_relacion}
 * @async
 * @function modificarAutorizacionGestoria
 * @param {string} idRelacion - Identificador de la relación.
 * @param {GestoriaEmpresaUpdate} payload - Campos que se actualizarán.
 * @returns {Promise<GestoriaEmpresaResponse>} Autorización actualizada.
 * @throws {Error} Mensaje de la API o error genérico de modificación.
 */
export const modificarAutorizacionGestoria = async (idRelacion: string, payload: GestoriaEmpresaUpdate): Promise<GestoriaEmpresaResponse> => {
  try { return (await api.patch<GestoriaEmpresaResponse>(`/api/gestorias-empresas/${idRelacion}`, payload)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al modificar la autorización de gestoría."); }
};

/**
 * Revoca la autorización de gestoría indicada.
 * URI: DELETE /api/gestorias-empresas/{id_relacion}
 * @async
 * @function revocarAutorizacionGestoria
 * @param {string} idRelacion - Identificador de la relación.
 * @returns {Promise<{ detail: string }>} Confirmación de la revocación.
 * @throws {Error} Mensaje de la API o error genérico de revocación.
 */
export const revocarAutorizacionGestoria = async (idRelacion: string): Promise<{ detail: string }> => {
  try { return (await api.delete<{ detail: string }>(`/api/gestorias-empresas/${idRelacion}`)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al revocar la autorización de gestoría."); }
};
