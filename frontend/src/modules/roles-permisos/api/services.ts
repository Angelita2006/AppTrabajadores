import api from "@/src/service/api/api";
import {
  RolPermisoCreate,
  RolPermisoSimpleResponse,
} from "../types/rol-permiso";

/**
 * Servicio de permisos vinculados a roles.
 * Consulta y administra las asociaciones que determinan los permisos de cada rol.
 */

/**
 * Lista los permisos asignados a un rol.
 * URI: GET /api/roles-permisos/rol/{id_rol}
 *
 * @async
 * @function obtenerPermisosRol
 * @param {string} idRol - Identificador del rol.
 * @returns {Promise<RolPermisoSimpleResponse[]>} Asociaciones de permisos del rol.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerPermisosRol = async (
  idRol: string,
): Promise<RolPermisoSimpleResponse[]> => {
  try {
    const respuesta = await api.get<RolPermisoSimpleResponse[]>(
      `/api/roles-permisos/rol/${idRol}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const mensaje = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(mensaje || "Error al obtener los permisos del rol.");
  }
};

/**
 * Asigna un permiso a un rol.
 * URI: POST /api/roles-permisos
 *
 * @async
 * @function asignarPermisoRol
 * @param {RolPermisoCreate} payload - Identificadores del rol y del permiso.
 * @returns {Promise<RolPermisoSimpleResponse>} Asociación creada.
 * @throws {Error} Mensaje de la API o error genérico de asignación.
 */
export const asignarPermisoRol = async (
  payload: RolPermisoCreate,
): Promise<RolPermisoSimpleResponse> => {
  try {
    const respuesta = await api.post<RolPermisoSimpleResponse>(
      "/api/roles-permisos",
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    const mensaje = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(mensaje || "Error al asignar el permiso al rol.");
  }
};

/**
 * Retira una asociación de permiso y rol.
 * URI: DELETE /api/roles-permisos/{id_relacion}
 *
 * @async
 * @function retirarPermisoRol
 * @param {string} idRelacion - Identificador de la asociación rol-permiso.
 * @returns {Promise<void>} No devuelve contenido (HTTP 204).
 * @throws {Error} Mensaje de la API o error genérico de eliminación.
 */
export const retirarPermisoRol = async (idRelacion: string): Promise<void> => {
  try {
    await api.delete<void>(`/api/roles-permisos/${idRelacion}`);
  } catch (error: any) {
    const mensaje = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(mensaje || "Error al retirar el permiso del rol.");
  }
};
