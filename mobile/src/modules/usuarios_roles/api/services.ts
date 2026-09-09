import api from "@/src/service/api/api";
import { UsuarioRol, UsuarioRolCreate } from "../types/usuario_rol";

/**
 * Servicio de Gestión de Roles de Usuario.
 * Contiene todas las operaciones CRUD para el control de asignaciones y permisos de rol.
 */

/**
 * Obtiene el listado completo de todas las asignaciones de roles registradas en el sistema.
 * URI: GET /api/usuarios-roles
 *
 * @async
 * @function obtenerTodasLasAsignacionesDeRoles
 * @returns {Promise<UsuarioRol[]>} Promesa con un listado de todas las asignaciones existentes.
 * @throws {Error} Lanza un error si ocurre un fallo de red o error en el servidor.
 */
export const obtenerTodasLasAsignacionesDeRoles = async (): Promise<
  UsuarioRol[]
> => {
  try {
    const respuesta = await api.get<UsuarioRol[]>("/api/usuarios-roles");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener todas las asignaciones de roles.",
    );
  }
};

/**
 * Obtiene los roles asignados a un usuario específico mediante su identificador.
 * URI: GET /api/usuarios-roles/usuario/{id_usuario}
 *
 * @async
 * @function obtenerRolPorUsuario
 * @param {string} idUsuario - Identificador único universal (UUID) del usuario.
 * @returns {Promise<UsuarioRol>} Promesa con el objeto de rol asignado al usuario.
 * @throws {Error} Lanza un error si el usuario no cuenta con un rol asignado o no se encuentra.
 */
export const obtenerRolPorUsuario = async (
  idUsuario: string,
): Promise<UsuarioRol> => {
  try {
    const respuesta = await api.get<UsuarioRol>(
      `/api/usuarios-roles/usuario/${idUsuario}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Error al recuperar los roles del usuario ${idUsuario}.`,
    );
  }
};

/**
 * Vincula un nuevo rol a un usuario en el sistema.
 * URI: POST /api/usuarios-roles
 * *Nota: Requiere permisos de Administrador.*
 *
 * @async
 * @function asignarRolUsuario
 * @param {UsuarioRolCreate} payload - Objeto con los datos necesarios para la creación de la relación (`UsuarioRolCreate`).
 * @returns {Promise<UsuarioRol>} Promesa con la asignación de rol recién creada.
 * @throws {Error} Lanza un error si hay fallos de integridad o falta de privilegios.
 */
export const asignarRolUsuario = async (
  payload: UsuarioRolCreate,
): Promise<UsuarioRol> => {
  try {
    const respuesta = await api.post<UsuarioRol>(
      "/api/usuarios-roles",
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error de integridad al consolidar el rol del usuario.",
    );
  }
};

/**
 * Modifica el rol actual asignado a un usuario de manera directa.
 * URI: PUT /api/usuarios-roles/{id_usuario}/rol
 *
 * @async
 * @function cambiarRolAsignadoUsuario
 * @param {string} idUsuario - Identificador único universal (UUID) del usuario.
 * @param {string} idRol - Identificador único universal (UUID) del nuevo rol que se aplicará.
 * @returns {Promise<UsuarioRol>} Promesa con la relación actualizada del usuario y su nuevo rol.
 * @throws {Error} Lanza un error si la actualización no se puede completar.
 */
export const cambiarRolAsignadoUsuario = async (
  idUsuario: string,
  idRol: string,
): Promise<UsuarioRol> => {
  try {
    const respuesta = await api.put<UsuarioRol>(
      `/api/usuarios-roles/${idUsuario}/rol`,
      null,
      { params: { nuevo_rol: idRol } },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al modificar el rol asignado al usuario.",
    );
  }
};

/**
 * Elimina o revoca una asignación de rol existente sobre un usuario.
 * URI: DELETE /api/usuarios-roles/{id_asignacion}
 *
 * @async
 * @function revocarRolUsuario
 * @param {string} idAsignacion - Identificador único universal (UUID) de la asignación de rol a revocar.
 * @returns {Promise<void>} Promesa vacía al completarse con éxito la eliminación.
 * @throws {Error} Lanza un error si el identificador no existe o la API rechaza la petición.
 */
export const revocarRolUsuario = async (
  idAsignacion: string,
): Promise<void> => {
  try {
    const respuesta = await api.delete(`/api/usuarios-roles/${idAsignacion}`);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al revocar la asignación de rol.");
  }
};
