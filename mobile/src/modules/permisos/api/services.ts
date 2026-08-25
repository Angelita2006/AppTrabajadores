import api from "@/src/service/api/api";
import { Permiso, PermisoCreate } from "../types/permiso";

/**
 * Registra una nueva capacidad o permiso en el sistema.
 * Exclusivo para administradores.
 */
export const crearPermisoSeguridad = async (
  data: PermisoCreate,
): Promise<Permiso> => {
  try {
    const respuesta = await api.post<Permiso>("/api/permisos", data);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(
      apiMessage || "Ha ocurrido un error al guardar el permiso.",
    );
  }
};

/**
 * Devuelve el catálogo completo de capacidades y llaves de acceso global.
 */
export const obtenerTodosLosPermisos = async (): Promise<Permiso[]> => {
  try {
    const respuesta = await api.get<Permiso[]>("/api/permisos");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(apiMessage || "Error al obtener el catálogo de permisos.");
  }
};
