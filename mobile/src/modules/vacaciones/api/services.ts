import api from "../../../service/api/api";
import {
  AusenciaCreateRequest,
  AusenciaResponse,
  EstadoAusencia,
} from "../types/ausencia";

/**
 * Servicio de Gestión de Ausencias.
 * Contiene todas las operaciones CRUD y lógicas de negocio para el registro, consulta y resolución de ausencias.
 */

/**
 * Obtiene el listado completo de todas las ausencias registradas en el sistema.
 * URI: GET /api/ausencias
 *
 * @async
 * @function obtenerTodasLasAusencias
 * @returns {Promise<AusenciaResponse[]>} Promesa con el listado completo de ausencias.
 * @throws {Error} Lanza un error si ocurre un fallo de red o error en el servidor.
 */
export const obtenerTodasLasAusencias = async (): Promise<
  AusenciaResponse[]
> => {
  try {
    const respuesta = await api.get<AusenciaResponse[]>("/api/ausencias");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(apiMessage || "Error al obtener el listado de ausencias.");
  }
};

/**
 * Recupera las solicitudes de ausencia correspondientes a un trabajador específico.
 * URI: GET /api/ausencias/trabajador/{id_trabajador}
 *
 * @async
 * @function obtenerAusenciasTrabajador
 * @param {string} idTrabajador - Identificador único universal (UUID) del trabajador.
 * @returns {Promise<AusenciaResponse[]>} Promesa con las ausencias del trabajador.
 * @throws {Error} Lanza un error si el trabajador no existe o falla la recuperación.
 */
export const obtenerAusenciasTrabajador = async (
  idTrabajador: string,
): Promise<AusenciaResponse[]> => {
  try {
    const respuesta = await api.get<AusenciaResponse[]>(
      `/api/ausencias/trabajador/${idTrabajador}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(
      apiMessage || "Error al recuperar las ausencias del trabajador.",
    );
  }
};

/**
 * Obtiene el listado de ausencias asociadas a una empresa específica.
 * URI: GET /api/ausencias/empresa/{id_empresa}
 *
 * @async
 * @function obtenerAusenciasEmpresa
 * @param {string} idEmpresa - Identificador único universal (UUID) de la empresa.
 * @returns {Promise<AusenciaResponse[]>} Promesa con el listado de ausencias de la empresa.
 * @throws {Error} Lanza un error si la empresa no existe o hay un fallo de comunicación.
 */
export const obtenerAusenciasEmpresa = async (
  idEmpresa: string,
): Promise<AusenciaResponse[]> => {
  try {
    const respuesta = await api.get<AusenciaResponse[]>(
      `/api/ausencias/empresa/${idEmpresa}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener las ausencias de la empresa.",
    );
  }
};

/**
 * Registra una nueva solicitud de ausencia en el sistema.
 * URI: POST /api/ausencias
 *
 * @async
 * @function solicitarAusencia
 * @param {AusenciaCreateRequest} payload - Objeto con los datos necesarios para crear la ausencia (`AusenciaCreateRequest`).
 * @returns {Promise<AusenciaResponse>} Promesa con el objeto de respuesta de la ausencia creada.
 * @throws {Error} Lanza un error si los datos no son válidos o la API rechaza la solicitud.
 */
export const solicitarAusencia = async (
  payload: AusenciaCreateRequest,
): Promise<AusenciaResponse> => {
  try {
    const respuesta = await api.post<AusenciaResponse>(
      "/api/ausencias",
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(
      apiMessage || "Error al registrar la solicitud de ausencia.",
    );
  }
};

/**
 * Actualiza de forma básica el estado de una ausencia.
 * URI: PUT /api/ausencias/{id_ausencia}/estado
 *
 * @async
 * @function actualizarEstadoAusencia
 * @param {string} idAusencia - Identificador único universal (UUID) de la ausencia.
 * @param {EstadoAusencia} nuevoEstado - El nuevo estado que se aplicará (`EstadoAusencia`).
 * @returns {Promise<AusenciaResponse>} Promesa con la ausencia actualizada.
 * @throws {Error} Lanza un error si la actualización no se puede completar.
 */
export const actualizarEstadoAusencia = async (
  idAusencia: string,
  nuevoEstado: EstadoAusencia,
): Promise<AusenciaResponse> => {
  const url = `/api/ausencias/${idAusencia}/estado?nuevo_estado=${nuevoEstado}`;

  try {
    const respuesta = await api.put<AusenciaResponse>(url);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al actualizar el estado de la ausencia ${idAusencia}.`,
    );
  }
};

/**
 * Tramita de forma avanzada la resolución (aprobación o rechazo) de una solicitud de ausencia,
 * permitiendo adjuntar observaciones y el identificador del usuario administrador resolutor.
 * URI: PUT /api/ausencias/{id_ausencia}/resolver
 *
 * @async
 * @function resolverSolicitudAusencia
 * @param {string} idAusencia - Identificador único universal (UUID) de la ausencia.
 * @param {EstadoAusencia} nuevoEstado - El estado resultante de la resolución (`EstadoAusencia`).
 * @param {string} idUsuarioResolutor - Identificador único universal (UUID) del usuario administrador que resuelve.
 * @param {string} [observaciones] - Comentarios u observaciones opcionales añadidos por el administrador.
 * @returns {Promise<AusenciaResponse>} Promesa con la ausencia ya resuelta.
 * @throws {Error} Lanza un error si la operación falla o no se tienen los permisos necesarios.
 */
export const resolverSolicitudAusencia = async (
  idAusencia: string,
  nuevoEstado: EstadoAusencia,
  idUsuarioResolutor: string,
  observaciones?: string,
): Promise<AusenciaResponse> => {
  try {
    const respuesta = await api.put<AusenciaResponse>(
      `/api/ausencias/${idAusencia}/resolver`,
      null,
      {
        params: {
          nuevo_estado: nuevoEstado,
          resolutor_usuario_id: idUsuarioResolutor,
          ...(observaciones && { observaciones }),
        },
      },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(
      apiMessage || "Error al resolver la solicitud de ausencia.",
    );
  }
};
