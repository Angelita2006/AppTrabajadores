import api from "@/src/service/api/api";
import {
  IncidenciaCreateRequest,
  IncidenciaResponse,
} from "../types/correccion";

/**
 * Lista el histórico completo de solicitudes aplicando aislamiento multi-tenant.
 */
export const obtenerTodasLasCorrecciones = async (): Promise<
  IncidenciaResponse[]
> => {
  try {
    const respuesta = await api.get<IncidenciaResponse[]>("/api/correcciones");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al obtener el listado completo de correcciones.",
    );
  }
};

/**
 * Envía una solicitud de rectificación horaria a Recursos Humanos.
 */
export const solicitarCorreccionHoraria = async (
  data: IncidenciaCreateRequest,
): Promise<IncidenciaResponse> => {
  try {
    const respuesta = await api.post<IncidenciaResponse>(
      "/api/correcciones",
      data,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al registrar la solicitud de corrección horaria.",
    );
  }
};

/**
 * Filtra las peticiones dentro de un mismo tenant (útil para el panel de RRHH de la empresa).
 */
export const obtenerCorreccionesPorEmpresa = async (
  idEmpresa: string,
): Promise<IncidenciaResponse[]> => {
  try {
    const respuesta = await api.get<IncidenciaResponse[]>(
      `/api/correcciones/empresa/${idEmpresa}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al obtener las correcciones de la empresa ${idEmpresa}.`,
    );
  }
};

/**
 * Permite al empleado seguir el estado de sus peticiones enviadas desde la app móvil.
 */
export const obtenerCorreccionesTrabajador = async (
  idTrabajador: string,
): Promise<IncidenciaResponse[]> => {
  try {
    const respuesta = await api.get<IncidenciaResponse[]>(
      `/api/correcciones/trabajador/${idTrabajador}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al obtener las correcciones del trabajador ${idTrabajador}.`,
    );
  }
};

/**
 * Descarga el histórico de incidencias de un operario particular.
 */
export const obtenerIncidenciasTrabajador = async (
  idTrabajador: string,
): Promise<IncidenciaResponse[]> => {
  return obtenerCorreccionesTrabajador(idTrabajador);
};

/**
 * Recupera el registro de peticiones de rectificación horaria.
 */
export const obtenerCorreccionesSolicitadasTrabajador = async (
  idTrabajador: string,
): Promise<IncidenciaResponse[]> => {
  return obtenerCorreccionesTrabajador(idTrabajador);
};

/**
 * Resuelve una incidencia de fichaje cambiándola a 'aprobada' o 'rechazada'.
 */
export const resolverSolicitudCorreccion = async (
  idCorreccion: string,
  nuevoEstado: "Aprobada" | "Rechazada",
  resolutorUsuarioId: string,
): Promise<any> => {
  try {
    const respuesta = await api.put<any>(
      `/api/correcciones/${idCorreccion}/resolver`,
      null,
      {
        params: {
          nuevo_estado: nuevoEstado,
          resolutor_usuario_id: resolutorUsuarioId,
        },
      },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al resolver la solicitud de corrección ${idCorreccion}.`,
    );
  }
};

/**
 * Elimina físicamente un registro de solicitud de corrección por su ID.
 */
export const eliminarSolicitudCorreccion = async (
  idCorreccion: string,
): Promise<void> => {
  try {
    await api.delete(`/api/correcciones/${idCorreccion}`);
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al eliminar la solicitud de corrección ${idCorreccion}.`,
    );
  }
};

/**
 * Restaura una incidencia y su fichaje afectado al estado pendiente original.
 */
export const restaurarCorreccionPendiente = async (
  idCorreccion: string,
): Promise<any> => {
  try {
    const respuesta = await api.put<any>(
      `/api/correcciones/${idCorreccion}/restaurar-pendiente`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al restaurar la corrección ${idCorreccion} a estado pendiente.`,
    );
  }
};
