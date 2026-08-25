import api from "../../../service/api/api";
import { FichajeCreateParams, RegistroFichaje } from "../types/registrofichaje";

/**
 * Envía un marcaje horario inmutable hacia la tabla 'fichajes' de PostgreSQL.
 */
export const registrarFichaje = async (
  data: FichajeCreateParams,
): Promise<RegistroFichaje> => {
  const respuesta = await api.post<RegistroFichaje>("/api/fichajes", data);
  return respuesta.data;
};

/**
 * Obtiene el historial global de fichajes registrados de la plataforma (filtrado por tenant en el backend).
 */
export const obtenerFichajes = async (): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>("/api/fichajes");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al recuperar el historial de fichajes.",
    );
  }
};

/**
 * Recupera el historial completo de marcajes para un trabajador y organización particulares.
 */
export const obtenerFichajesTrabajadorYEmpresa = async (
  idTrabajador: string,
  idEmpresa: string,
): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>(
      `/api/fichajes/trabajador/${idTrabajador}/empresa/${idEmpresa}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al recuperar los fichajes del trabajador.",
    );
  }
};

/**
 * Descarga todos los marcajes del día actual para un trabajador.
 */
export const obtenerFichajesHoy = async (
  trabajadorId: string,
): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>(
      `/api/fichajes/trabajador/${trabajadorId}/hoy`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al obtener los fichajes de hoy.");
  }
};

/**
 * Recupera el historial de la semana actual del trabajador.
 */
export const obtenerFichajesSemanaActual = async (
  idTrabajador: string,
): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>(
      `/api/fichajes/trabajador/${idTrabajador}/semana`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener los fichajes de la semana.",
    );
  }
};

/**
 * Recupera el historial de fichajes dentro del turno actual del trabajador.
 */
export const obtenerFichajesTurnoActual = async (
  idTrabajador: string,
): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>(
      `/api/fichajes/trabajador/${idTrabajador}/turno`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener los fichajes del turno actual.",
    );
  }
};

/**
 * Descarga de forma eficiente el marcaje más reciente del operario.
 */
export const obtenerUltimoFichaje = async (
  trabajadorId: string,
): Promise<RegistroFichaje> => {
  try {
    const respuesta = await api.get<RegistroFichaje>(
      `/api/fichajes/trabajador/${trabajadorId}/ultimo`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al consultar el último fichaje.");
  }
};

/**
 * Recupera el historial consolidado de marcajes de toda la plantilla para una fecha concreta.
 */
export const obtenerFichajesEmpresaPorFecha = async (
  empresaId: string,
  fechaStr: string,
): Promise<RegistroFichaje[]> => {
  try {
    const respuesta = await api.get<RegistroFichaje[]>(
      `/api/fichajes/empresa/${empresaId}`,
      {
        params: { fecha: fechaStr },
      },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener los fichajes de la empresa por fecha.",
    );
  }
};
