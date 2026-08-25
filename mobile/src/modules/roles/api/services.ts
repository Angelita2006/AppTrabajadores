import api from "@/src/service/api/api";
import { Rol, RolCreate } from "../types/rol";

/**
 * Registra un nuevo rol dentro del catálogo maestro de la plataforma SaaS.
 * Exclusivo para administradores.
 */
export const crearRolSeguridad = async (data: RolCreate): Promise<Rol> => {
  try {
    const respuesta = await api.post<Rol>("/api/roles", data);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(apiMessage || "Ha ocurrido un error al guardar el rol.");
  }
};

/**
 * Devuelve el catálogo completo de roles de seguridad definidos.
 */
export const obtenerRolesEmpresa = async (
  empresaId: string,
): Promise<Rol[]> => {
  // try {
  const respuesta = await api.get<Rol[]>(`/api/roles/empresa/${empresaId}`);
  return respuesta.data;
  // } catch (error: any) {
  //   const apiMessage = respuesta.data;
  //   throw new Error(
  //     apiMessage || "Error al obtener el catálogo de roles de la empresa.",
  //   );
  // }
};

/**
 * Busca las características de un rol específico utilizando su identificador numérico.
 */
export const obtenerRolPorId = async (idRol: string): Promise<Rol> => {
  try {
    const respuesta = await api.get<Rol>(`/api/roles/${idRol}`);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(apiMessage || `Error al obtener el rol con ID ${idRol}.`);
  }
};
