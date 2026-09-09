import api from "@/src/service/api/api";
import { Rol, RolCreate } from "../types/rol";

/**
 * Servicio de Gestión de Roles y Permisos de Seguridad.
 * Contiene todas las operaciones CRUD y lógicas de negocio para el registro, consulta y administración de los roles del sistema SaaS.
 */

/**
 * Obtiene el catálogo completo de roles de seguridad definidos en la plataforma.
 * URI: GET /api/roles
 *
 * @async
 * @function obtenerRoles
 * @returns {Promise<Rol[]>} Promesa con el listado completo de roles de seguridad.
 * @throws {Error} Lanza un error si ocurre un fallo al recuperar los roles.
 */
export const obtenerRoles = async (): Promise<Rol[]> => {
  try {
    const respuesta = await api.get<Rol[]>("/api/roles");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al recuperar el catálogo de roles de seguridad.",
    );
  }
};

/**
 * Busca las características y atributos detallados de un rol específico utilizando su identificador único universal.
 * URI: GET /api/roles/{id_rol}
 *
 * @async
 * @function obtenerRolPorId
 * @param {string} idRol - Identificador único universal (UUID) del rol.
 * @returns {Promise<Rol>} Promesa con los detalles del rol solicitado.
 * @throws {Error} Lanza un error si el rol no se encuentra.
 */
export const obtenerRolPorId = async (idRol: string): Promise<Rol> => {
  try {
    const respuesta = await api.get<Rol>(`/api/roles/${idRol}`);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || `Error al obtener el rol con ID ${idRol}.`);
  }
};

/**
 * Registra un nuevo rol dentro del catálogo maestro de la plataforma SaaS.
 * URI: POST /api/roles
 *
 * @async
 * @function crearRolSeguridad
 * @param {RolCreate} payload - Objeto con los datos necesarios para registrar el nuevo rol.
 * @returns {Promise<Rol>} Promesa con el rol de seguridad recién creado.
 * @throws {Error} Lanza un error si los datos no son válidos o falla el registro.
 */
export const crearRolSeguridad = async (payload: RolCreate): Promise<Rol> => {
  try {
    const respuesta = await api.post<Rol>("/api/roles", payload);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Ha ocurrido un error al guardar el rol.");
  }
};
