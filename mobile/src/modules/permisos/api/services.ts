import api from "../../../service/api/api";
import { Permiso, PermisoCreate } from "../types/permiso";

/**
 * Servicio de Gestión de Permisos y Capacidades de Acceso.
 * Contiene todas las operaciones CRUD y lógicas de negocio para el catálogo y control de permisos de seguridad en el sistema SaaS.
 */

/**
 * Devuelve el catálogo completo de capacidades y llaves de acceso global de seguridad.
 * URI: GET /api/permisos
 *
 * @async
 * @function obtenerTodosLosPermisos
 * @returns {Promise<Permiso[]>} Promesa con el listado completo del catálogo de permisos.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener el catálogo de permisos.
 */
export const obtenerTodosLosPermisos = async (): Promise<Permiso[]> => {
  try {
    const respuesta = await api.get<Permiso[]>("/api/permisos");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al obtener el catálogo de permisos.");
  }
};

/**
 * Registra una nueva capacidad o permiso en el sistema. Exclusivo para administradores.
 * URI: POST /api/permisos
 *
 * @async
 * @function crearPermisoSeguridad
 * @param {PermisoCreate} payload - Objeto con los datos necesarios para registrar el nuevo permiso.
 * @returns {Promise<Permiso>} Promesa con el permiso de seguridad recién creado.
 * @throws {Error} Lanza un error si los datos no son válidos o falla el registro.
 */
export const crearPermisoSeguridad = async (
  payload: PermisoCreate,
): Promise<Permiso> => {
  try {
    const respuesta = await api.post<Permiso>("/api/permisos", payload);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Ha ocurrido un error al guardar el permiso.",
    );
  }
};
