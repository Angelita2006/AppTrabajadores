import api from "@/src/service/api/api";
import { UsuarioRol, UsuarioRolCreate } from "../types/usuario_rol";

/**
 * Vincula un rol específico a una cuenta de usuario dentro de un ámbito (tenant).
 * Requiere permisos de Administrador.
 */
export const asignarRolUsuario = async (
  data: UsuarioRolCreate,
): Promise<UsuarioRol> => {
  try {
    const respuesta = await api.post<UsuarioRol>("/api/usuarios-roles", data);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(
      apiMessage || "Error de integridad al consolidar el rol del usuario.",
    );
  }
};

/**
 * Devuelve la matriz global de asignaciones de roles.
 */
export const obtenerTodasLasAsignacionesDeRoles = async (): Promise<
  UsuarioRol[]
> => {
  try {
    const respuesta = await api.get<UsuarioRol[]>("/api/usuarios-roles");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al obtener la matriz de asignación de roles.",
    );
  }
};

/**
 * Recupera los roles asignados a un usuario específico mediante su UUID.
 */
export const obtenerRolesPorUsuario = async (
  idUsuario: string,
): Promise<UsuarioRol[]> => {
  try {
    const respuesta = await api.get<UsuarioRol[]>(
      `/api/usuarios-roles/usuario/${idUsuario}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(
      apiMessage || `Error al recuperar los roles del usuario ${idUsuario}.`,
    );
  }
};

/**
 * Modifica el rol asignado a un usuario existente.
 */
export const cambiarRolAsignadoUsuario = async (
  idUsuario: string,
  nuevoRolId: number,
): Promise<UsuarioRol> => {
  try {
    const respuesta = await api.put<UsuarioRol>(
      `/api/usuarios-roles/${idUsuario}/rol`,
      null,
      { params: { nuevo_rol: nuevoRolId } },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al modificar el rol asignado al usuario.",
    );
  }
};

/**
 * Elimina físicamente una asignación de rol mediante el ID de la asignación.
 */
export const revocarRolUsuario = async (
  idAsignacion: string,
): Promise<void> => {
  try {
    await api.delete(`/api/usuarios-roles/${idAsignacion}`);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(apiMessage || "Error al revocar la asignación de rol.");
  }
};
