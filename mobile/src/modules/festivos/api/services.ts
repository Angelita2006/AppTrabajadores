import api from "@/src/service/api/api";
import { Festivo, FestivoCreate, FestivoUpdate } from "../types/festivo";

/**
 * Devuelve la lista global de días festivos aplicando aislamiento multi-tenant a través del calendario laboral.
 */
export const obtenerTodosLosFestivos = async (): Promise<Festivo[]> => {
  try {
    const response = await api.get<Festivo[]>("/api/festivos");
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al obtener todos los festivos.");
  }
};

/**
 * Recupera de forma ordenada el catálogo de días no laborables asignados a un calendario específico.
 */
export const obtenerFestivosPorCalendario = async (
  idCalendario: string,
): Promise<Festivo[]> => {
  try {
    const response = await api.get<Festivo[]>(
      `/api/festivos/calendario/${idCalendario}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Error al obtener los festivos del calendario.`,
    );
  }
};

/**
 * Registra un nuevo día festivo en el backend.
 */
export const crearFestivo = async (
  payload: FestivoCreate,
): Promise<Festivo> => {
  try {
    const response = await api.post<Festivo>("/api/festivos", payload);
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al crear el día festivo en el servidor.",
    );
  }
};

/**
 * Modifica un festivo existente mediante Query Params.
 */
export const editarFestivo = async (
  idFestivo: string,
  params: FestivoUpdate,
): Promise<Festivo> => {
  try {
    const response = await api.put<Festivo>(
      `/api/festivos/${idFestivo}/editar`,
      null,
      {
        params: {
          nueva_fecha: params.nueva_fecha,
          nuevo_tipo: params.nuevo_tipo,
          nueva_descripcion: params.nueva_descripcion,
        },
      },
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al editar el festivo en el servidor.");
  }
};

/**
 * Elimina un día festivo del calendario.
 */
export const eliminarFestivo = async (
  idFestivo: string,
): Promise<{ detail: string }> => {
  try {
    const response = await api.delete<{ detail: string }>(
      `/api/festivos/${idFestivo}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al eliminar el día festivo.");
  }
};
