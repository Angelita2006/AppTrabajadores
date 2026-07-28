import api from "../../../service/api/api";
import {
  AusenciaCreateRequest,
  AusenciaResponse,
  EstadoAusencia,
  TipoAusencia,
} from "../types/ausencia";

/**
 * Obtiene el registro histórico global de todas las ausencias del sistema.
 */
export const obtenerTodasLasAusencias = async (): Promise<
  AusenciaResponse[]
> => {
  try {
    const respuesta = await api.get<AusenciaResponse[]>("/api/ausencias");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(apiMessage || "Error al obtener el listado de ausencias.");
  }
};

/**
 * Alias de compatibilidad para listar todas las ausencias.
 */
export const obtenerVacaciones = obtenerTodasLasAusencias;

/**
 * Recupera el histórico de solicitudes de vacaciones, bajas o permisos de un empleado concreto.
 */
export const obtenerAusenciasYVacacionesTrabajador = async (
  idTrabajador: string,
): Promise<AusenciaResponse[]> => {
  try {
    const respuesta = await api.get<AusenciaResponse[]>(
      `/api/ausencias/trabajador/${idTrabajador}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al recuperar las ausencias del trabajador.",
    );
  }
};

/**
 * Alias de compatibilidad para la recuperación de ausencias del trabajador.
 */
export const obtenerVacacionesTrabajador =
  obtenerAusenciasYVacacionesTrabajador;

/**
 * Obtiene las ausencias y vacaciones asociadas a toda una empresa.
 */
export const obtenerAusenciasYVacacionesEmpresa = async (
  idEmpresa: string,
): Promise<AusenciaResponse[]> => {
  try {
    const respuesta = await api.get<AusenciaResponse[]>(
      `/api/ausencias/empresa/${idEmpresa}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al obtener las ausencias de la empresa.",
    );
  }
};

/**
 * Transmite una nueva petición de días libres o baja hacia la tabla 'ausencias'.
 */
export const solicitarAusenciaOVacaciones = async (
  data: AusenciaCreateRequest,
): Promise<AusenciaResponse> => {
  try {
    const respuesta = await api.post<AusenciaResponse>("/api/ausencias", data);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al registrar la solicitud de ausencia.",
    );
  }
};

/**
 * Alias de solicitud de ausencia u organización de vacaciones.
 */
export const asignarAusenciaOVacaciones = solicitarAusenciaOVacaciones;

/**
 * Alias de compatibilidad adaptado al formato de creación clásico.
 */
export const crearVacacion = async (data: {
  idEmpresa: string;
  idTrabajador: string;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  tipoAusencia?: TipoAusencia;
  justificanteMetadata?: Record<string, any>;
}): Promise<AusenciaResponse> => {
  const payload: AusenciaCreateRequest = {
    empresa_id: data.idEmpresa,
    trabajador_id: data.idTrabajador,
    tipo_ausencia: data.tipoAusencia || TipoAusencia.VACACIONES,
    fecha_inicio: data.fechaInicio,
    fecha_fin: data.fechaFin,
    motivo: data.motivo,
    justificante_metadata: data.justificanteMetadata || {},
  };
  return await solicitarAusenciaOVacaciones(payload);
};

export const createVacacion = crearVacacion;

/**
 * Envía una petición PUT rápida para actualizar el estado de una ausencia específica.
 */
export const actualizarEstadoAusencia = async (
  ausenciaId: string,
  nuevoEstado: EstadoAusencia,
): Promise<AusenciaResponse> => {
  const url = `/api/ausencias/${ausenciaId}/estado?nuevo_estado=${nuevoEstado}`;

  try {
    const respuesta = await api.put<AusenciaResponse>(url);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al actualizar el estado de la ausencia ${ausenciaId}.`,
    );
  }
};

/**
 * Alias para responder solicitudes de vacaciones de forma simple.
 */
export const responderSolicitudVacacion = async (
  idVacacion: string,
  nuevoEstado: EstadoAusencia,
): Promise<AusenciaResponse> => {
  return await actualizarEstadoAusencia(idVacacion, nuevoEstado);
};

/**
 * Tramita de forma avanzada la resolución (aprobación/rechazo) incluyendo observaciones y ID del admin resolutor.
 */
export const resolverSolicitudAusencia = async (
  idAusencia: string,
  nuevoEstado: EstadoAusencia,
  resolutorUsuarioId: string,
  observaciones?: string,
): Promise<AusenciaResponse> => {
  try {
    const respuesta = await api.put<AusenciaResponse>(
      `/api/ausencias/${idAusencia}/resolver`,
      null,
      {
        params: {
          nuevo_estado: nuevoEstado,
          resolutor_usuario_id: resolutorUsuarioId,
          ...(observaciones && { observaciones }),
        },
      },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al resolver la solicitud de ausencia.",
    );
  }
};
