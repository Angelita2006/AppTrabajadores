import api from "../../../service/api/api";
import { ResumenJornada, ResumenJornadaCreate } from "../types/resumen-jornada";

/**
 * Obtiene el histórico completo de resúmenes de jornada del sistema (filtrado por tenant en el backend).
 */
export const obtenerResumenesJornada = async (): Promise<ResumenJornada[]> => {
  try {
    const respuesta = await api.get<ResumenJornada[]>("/api/resumenes-jornada");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al recuperar los resúmenes de jornada.",
    );
  }
};

/**
 * Obtiene los resúmenes de jornada asociados a un trabajador específico mediante su UUID.
 */
export const obtenerResumenesPorTrabajador = async (
  idTrabajador: string,
): Promise<ResumenJornada[]> => {
  try {
    const respuesta = await api.get<ResumenJornada[]>(
      `/api/resumenes-jornada/trabajador/${idTrabajador}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail || error.message;
    throw new Error(
      apiMessage ||
        "Error al recuperar los resúmenes de jornada del trabajador.",
    );
  }
};

/**
 * Obtiene el cuadro de mandos diario de una empresa para una fecha concreta (AAAA-MM-DD).
 */
export const obtenerCuadroMandosDiarioEmpresa = async (
  idEmpresa: string,
  fechaDia: string,
): Promise<ResumenJornada[]> => {
  try {
    const respuesta = await api.get<ResumenJornada[]>(
      `/api/resumenes-jornada/empresa/${idEmpresa}/fecha/${fechaDia}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        "Error al recuperar el cuadro de mandos diario de la empresa.",
    );
  }
};

/**
 * Registra o actualiza el cálculo acumulado diario de un operario.
 */
export const crearOActualizarResumen = async (
  data: ResumenJornadaCreate,
): Promise<ResumenJornada> => {
  try {
    const respuesta = await api.post<ResumenJornada>(
      "/api/resumenes-jornada",
      data,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al registrar o actualizar el resumen de jornada.",
    );
  }
};

/**
 * Consolida de manera definitiva (cierra) una fila diaria de resumen de jornada.
 */
export const consolidarJornadaMensual = async (
  idResumen: string,
): Promise<ResumenJornada> => {
  try {
    const respuesta = await api.put<ResumenJornada>(
      `/api/resumenes-jornada/${idResumen}/cerrar`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(apiMessage || "Error al consolidar la jornada.");
  }
};
