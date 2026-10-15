import api from "@/src/service/api/api";
import { RolPermisoCreate, RolPermisoResponse } from "../types/rol-permiso";

/**
 * Servicio de permisos vinculados a roles.
 * Consulta y administra las asociaciones que determinan los permisos de cada rol.
 */

/**
 * Lista los permisos asignados a un rol.
 * URI: GET /api/roles-permisos/rol/{id_rol}
 * @async
 * @function obtenerPermisosRol
 * @param {string} idRol - Identificador del rol.
 * @returns {Promise<RolPermisoResponse[]>} Permisos relacionados con el rol.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerPermisosRol = async (idRol: string): Promise<RolPermisoResponse[]> => {
  try { return (await api.get<RolPermisoResponse[]>(`/api/roles-permisos/rol/${idRol}`)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al obtener los permisos del rol."); }
};

/**
 * Asigna un permiso a un rol.
 * URI: POST /api/roles-permisos
 * @async
 * @function asignarPermisoRol
 * @param {RolPermisoCreate} payload - Identificadores del rol y del permiso.
 * @returns {Promise<RolPermisoResponse>} Asociación creada.
 * @throws {Error} Mensaje de la API o error genérico de asignación.
 */
export const asignarPermisoRol = async (payload: RolPermisoCreate): Promise<RolPermisoResponse> => {
  try { return (await api.post<RolPermisoResponse>("/api/roles-permisos", payload)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al asignar el permiso al rol."); }
};

/**
 * Retira una asociación de permiso y rol.
 * URI: DELETE /api/roles-permisos/{id_relacion}
 * @async
 * @function retirarPermisoRol
 * @param {string} idRelacion - Identificador de la asociación rol-permiso.
 * @returns {Promise<{ detail: string }>} Confirmación de la operación.
 * @throws {Error} Mensaje de la API o error genérico de eliminación.
 */
export const retirarPermisoRol = async (idRelacion: string): Promise<{ detail: string }> => {
  try { return (await api.delete<{ detail: string }>(`/api/roles-permisos/${idRelacion}`)).data; }
  catch (error: any) { throw new Error(error?.response?.data?.detail || error?.response?.data?.message || "Error al retirar el permiso del rol."); }
};
