import api from "@/src/service/api/api";
import { Festivo } from "../../festivos/types/festivo";
import {
  CalendarioFestivo,
  CalendarioLaboralCreate,
  CalendarioLaboralResponse,
  CalendarioLaboralUpdate,
} from "../types/calendario";

/**
 * Registra un nuevo calendario laboral en el sistema.
 */
export const crearCalendarioLaboral = async (
  payload: CalendarioLaboralCreate,
): Promise<CalendarioLaboralResponse> => {
  try {
    const respuesta = await api.post<CalendarioLaboralResponse>(
      "/api/calendarios-laborales",
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al registrar el nuevo calendario laboral.",
    );
  }
};

/**
 * Actualiza las propiedades básicas de un calendario laboral.
 */
export const modificarCalendarioLaboral = async (
  idCalendario: string,
  payload: CalendarioLaboralUpdate,
): Promise<CalendarioLaboralResponse> => {
  try {
    const respuesta = await api.put<CalendarioLaboralResponse>(
      `/api/calendarios-laborales/${idCalendario}`,
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al actualizar el calendario laboral ${idCalendario}.`,
    );
  }
};

/**
 * Recupera un calendario laboral específico mediante su ID.
 */
export const obtenerCalendario = async (
  calendarioId: string,
): Promise<CalendarioFestivo> => {
  try {
    const respuesta = await api.get<CalendarioFestivo>(
      `/api/calendarios-laborales/${calendarioId}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || `Calendario laboral con ID ${calendarioId} no encontrado.`,
    );
  }
};

/**
 * Recupera los calendarios anuales de una empresa junto con el listado de sus días festivos.
 */
export const obtenerCalendarioYFestivos = async (
  empresaId: string,
): Promise<CalendarioFestivo[]> => {
  try {
    const respuesta = await api.get<CalendarioFestivo[]>(
      `/api/calendarios-laborales/empresa/${empresaId}/con-festivos`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al recuperar los calendarios y festivos de la empresa ${empresaId}.`,
    );
  }
};

/**
 * Envía un archivo binario PDF al servidor para ser analizado mediante IA.
 */
export const importarCalendarioPDF = async (
  calendarioId: string,
  formData: FormData,
): Promise<{
  status: string;
  total_importados: number;
  festivos: Festivo[];
}> => {
  try {
    const respuesta = await api.post(
      `/api/calendarios-laborales/${calendarioId}/importar-pdf`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 45000,
      },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        "Error al procesar y guardar el archivo PDF del calendario.",
    );
  }
};

/**
 * Elimina físicamente un calendario laboral de la base de datos por su ID único.
 */
export const eliminarCalendarioLaboral = async (
  idCalendario: string,
): Promise<void> => {
  try {
    await api.delete(`/api/calendarios-laborales/${idCalendario}`);
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || `Error al eliminar el calendario laboral ${idCalendario}.`,
    );
  }
};
