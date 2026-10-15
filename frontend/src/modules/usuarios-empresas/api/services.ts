import api from "@/src/service/api/api";
import { UsuarioEmpresaCreate, UsuarioEmpresaResponse, UsuarioEmpresaUpdate } from "../types/usuario-empresa";

/**
 * Servicio de membresías de usuarios en empresas.
 * Administra las relaciones de acceso que vinculan usuarios, empresas y roles.
 */

/**
 * Lista las membresías globales de superadministración.
 * URI: GET /api/usuarios-empresas/global
 * @async
 * @function obtenerMembresiasGlobales
 * @returns {Promise<UsuarioEmpresaResponse[]>} Membresías globales.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerMembresiasGlobales = async (): Promise<UsuarioEmpresaResponse[]> => {
  try { return (await api.get<UsuarioEmpresaResponse[]>("/api/usuarios-empresas/global")).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener las membresías globales."); }
};

/**
 * Lista las membresías de usuarios vinculadas a una empresa.
 * URI: GET /api/usuarios-empresas/empresa/{id_empresa}
 * @async
 * @function obtenerMembresiasEmpresa
 * @param {string} idEmpresa - Identificador de la empresa.
 * @returns {Promise<UsuarioEmpresaResponse[]>} Membresías de la empresa.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerMembresiasEmpresa = async (idEmpresa: string): Promise<UsuarioEmpresaResponse[]> => {
  try { return (await api.get<UsuarioEmpresaResponse[]>(`/api/usuarios-empresas/empresa/${idEmpresa}`)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener las membresías de la empresa."); }
};

/**
 * Lista las membresías asociadas a un usuario.
 * URI: GET /api/usuarios-empresas/usuario/{id_usuario}
 * @async
 * @function obtenerMembresiasUsuario
 * @param {string} idUsuario - Identificador del usuario.
 * @returns {Promise<UsuarioEmpresaResponse[]>} Membresías del usuario.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerMembresiasUsuario = async (idUsuario: string): Promise<UsuarioEmpresaResponse[]> => {
  try { return (await api.get<UsuarioEmpresaResponse[]>(`/api/usuarios-empresas/usuario/${idUsuario}`)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener las membresías del usuario."); }
};

/**
 * Obtiene una membresía por su identificador.
 * URI: GET /api/usuarios-empresas/{id_relacion}
 * @async
 * @function obtenerMembresiaUsuario
 * @param {string} idRelacion - Identificador de la membresía.
 * @returns {Promise<UsuarioEmpresaResponse>} Membresía consultada.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerMembresiaUsuario = async (idRelacion: string): Promise<UsuarioEmpresaResponse> => {
  try { return (await api.get<UsuarioEmpresaResponse>(`/api/usuarios-empresas/${idRelacion}`)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener la membresía."); }
};

/**
 * Crea una membresía de usuario con la empresa y el rol indicados.
 * URI: POST /api/usuarios-empresas
 * @async
 * @function crearMembresiaUsuario
 * @param {UsuarioEmpresaCreate} payload - Usuario, empresa y rol que se vincularán.
 * @returns {Promise<UsuarioEmpresaResponse>} Membresía creada.
 * @throws {Error} Mensaje de la API o error genérico de creación.
 */
export const crearMembresiaUsuario = async (payload: UsuarioEmpresaCreate): Promise<UsuarioEmpresaResponse> => {
  try { return (await api.post<UsuarioEmpresaResponse>("/api/usuarios-empresas", payload)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al crear la membresía del usuario."); }
};

/**
 * Modifica el rol o la activación de una membresía.
 * URI: PATCH /api/usuarios-empresas/{id_relacion}
 * @async
 * @function modificarMembresiaUsuario
 * @param {string} idRelacion - Identificador de la membresía.
 * @param {UsuarioEmpresaUpdate} payload - Campos de la membresía que se actualizarán.
 * @returns {Promise<UsuarioEmpresaResponse>} Membresía actualizada.
 * @throws {Error} Mensaje de la API o error genérico de modificación.
 */
export const modificarMembresiaUsuario = async (idRelacion: string, payload: UsuarioEmpresaUpdate): Promise<UsuarioEmpresaResponse> => {
  try { return (await api.patch<UsuarioEmpresaResponse>(`/api/usuarios-empresas/${idRelacion}`, payload)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al modificar la membresía del usuario."); }
};

/**
 * Revoca una membresía global de superadministración.
 * URI: DELETE /api/usuarios-empresas/global/{id_relacion}
 * @async
 * @function revocarMembresiaGlobal
 * @param {string} idRelacion - Identificador de la membresía global.
 * @returns {Promise<{ detail: string }>} Confirmación de la revocación.
 * @throws {Error} Mensaje de la API o error genérico de revocación.
 */
export const revocarMembresiaGlobal = async (idRelacion: string): Promise<{ detail: string }> => {
  try { return (await api.delete<{ detail: string }>(`/api/usuarios-empresas/global/${idRelacion}`)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al revocar la membresía global."); }
};

/**
 * Desactiva una membresía empresarial.
 * URI: DELETE /api/usuarios-empresas/{id_relacion}
 * @async
 * @function desactivarMembresiaUsuario
 * @param {string} idRelacion - Identificador de la membresía.
 * @returns {Promise<{ detail: string }>} Confirmación de la desactivación.
 * @throws {Error} Mensaje de la API o error genérico de desactivación.
 */
export const desactivarMembresiaUsuario = async (idRelacion: string): Promise<{ detail: string }> => {
  try { return (await api.delete<{ detail: string }>(`/api/usuarios-empresas/${idRelacion}`)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al desactivar la membresía del usuario."); }
};
