import api from "@/src/service/api/api";
import { Contrato } from "../types/contrato";

/**
 * Registra un nuevo contrato laboral asociándolo al expediente del empleado en el sistema.
 * URI: POST /api/contratos
 *
 * @async
 * @function crearContrato
 * @param {Object} payload - Objeto con los datos requeridos para dar de alta el contrato laboral.
 * @returns {Promise<Contrato>} Promesa con el objeto `Contrato` recién creado.
 * @throws {Error} Lanza un error si falla la creación o existen inconsistencias en los datos proporcionados.
 */
export const crearContrato = async (payload: {
  trabajador_id: string;
  empresa_id: string;
  centro_trabajo_id: string;
  departamento_id: string;
  calendario_laboral_id: string;
  tipo_contrato: string;
  tipo_jornada: string;
  horas_semana: number;
  fecha_inicio: string;
  puesto_trabajo: string;
  categoria_profesional: string;
  fecha_fin?: string | null;
}): Promise<Contrato> => {
  try {
    const response = await api.post<Contrato>("/api/contratos", payload);
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        "Error de integridad al registrar el nuevo contrato laboral.",
    );
  }
};

/**
 * Obtiene el listado global de todos los contratos registrados en el sistema aplicando aislamiento multi-tenant.
 * URI: GET /api/contratos
 *
 * @async
 * @function obtenerTodosLosContratos
 * @returns {Promise<Contrato[]>} Promesa con el listado global de contratos.
 * @throws {Error} Lanza un error si ocurre un fallo al realizar la consulta al servidor.
 */
export const obtenerTodosLosContratos = async (): Promise<Contrato[]> => {
  try {
    const response = await api.get<Contrato[]>("/api/contratos");
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener el listado global de contratos.",
    );
  }
};

/**
 * Recupera el listado de contratos asociados a una empresa u organización específica.
 * URI: GET /api/contratos/empresa/{idEmpresa}
 *
 * @async
 * @function obtenerContratosPorEmpresa
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @returns {Promise<Contrato[]>} Promesa con la lista de contratos vinculados a la empresa.
 * @throws {Error} Lanza un error si falla la recuperación de los contratos de la empresa.
 */
export const obtenerContratosPorEmpresa = async (
  idEmpresa: string,
): Promise<Contrato[]> => {
  try {
    const response = await api.get<Contrato[]>(
      `/api/contratos/empresa/${idEmpresa}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al obtener los contratos de la empresa ${idEmpresa}.`,
    );
  }
};

/**
 * Recupera el historial o secuencia de contratos asociados a un trabajador específico.
 * URI: GET /api/contratos/trabajador/{idTrabajador}
 *
 * @async
 * @function obtenerContratosPorTrabajador
 * @param {string} idTrabajador - Identificador UUID único del trabajador.
 * @returns {Promise<Contrato[]>} Promesa con la lista histórica de contratos del trabajador.
 * @throws {Error} Lanza un error si ocurre un problema durante la consulta.
 */
export const obtenerContratosPorTrabajador = async (
  idTrabajador: string,
): Promise<Contrato[]> => {
  try {
    const response = await api.get<Contrato[]>(
      `/api/contratos/trabajador/${idTrabajador}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al obtener la secuencia histórica de contratos del trabajador ${idTrabajador}.`,
    );
  }
};

/**
 * Recupera el contrato actualmente activo de un empleado en una empresa determinada.
 * URI: GET /api/contratos/trabajador/{idTrabajador}/empresa/{idEmpresa}/activo
 *
 * @async
 * @function obtenerContratoActivoTrabajador
 * @param {string} idTrabajador - Identificador UUID único del trabajador.
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @returns {Promise<Contrato | null>} Promesa con el contrato activo o `null` si no tiene ninguno vigente.
 * @throws {Error} Lanza un error si falla la comunicación con el servidor (excluyendo el estado HTTP 404).
 */
export const obtenerContratoActivoTrabajador = async (
  idTrabajador: string,
  idEmpresa: string,
): Promise<Contrato | null> => {
  try {
    const response = await api.get<Contrato>(
      `/api/contratos/trabajador/${idTrabajador}/empresa/${idEmpresa}/activo`,
    );
    return response.data || null;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al obtener el contrato activo del trabajador ${idTrabajador} en la empresa ${idEmpresa}.`,
    );
  }
};

/**
 * Actualiza parcialmente los atributos de un contrato existente mediante su identificador único.
 * URI: PUT /api/contratos/{idContrato}
 *
 * @async
 * @function actualizarContrato
 * @param {string} idContrato - Identificador UUID único del contrato a modificar.
 * @param {Object} payload - Objeto con los parámetros opcionales a actualizar en el contrato.
 * @returns {Promise<Contrato>} Promesa con la entidad `Contrato` actualizada.
 * @throws {Error} Lanza un error si el contrato no existe o la actualización es rechazada.
 */
export const actualizarContrato = async (
  idContrato: string,
  payload: {
    trabajador_id: string;
    empresa_id: string;
    centro_trabajo_id: string;
    departamento_id: string;
    calendario_laboral_id: string;
    tipo_contrato: string;
    tipo_jornada: string;
    puesto_trabajo: string;
    categoria_profesional: string;
    horas_semana: number;
    fecha_inicio: string;
    fecha_fin?: string;
  },
): Promise<Contrato> => {
  try {
    const response = await api.put<Contrato>(
      `/api/contratos/${idContrato}`,
      payload,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Error al actualizar los datos del contrato ${idContrato}.`,
    );
  }
};

/**
 * Rescinde o da de baja el contrato laboral activo de un empleado en la empresa seleccionada.
 * URI: PUT /api/contratos/{idContrato}/dar-baja?fecha_fin=...
 *
 * @async
 * @function rescindirContratoActivoTrabajador
 * @param {string} idTrabajador - Identificador UUID único del trabajador.
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @param {string} [fechaFinPersonalizada] - Fecha de cese opcional en formato "AAAA-MM-DD" (por defecto la fecha actual).
 * @returns {Promise<Contrato | null>} Promesa con el contrato rescindido o `null` si no tenía un contrato activo.
 * @throws {Error} Lanza un error si ocurre un fallo durante la tramitación de la baja.
 */
export const rescindirContratoActivoTrabajador = async (
  idTrabajador: string,
  idEmpresa: string,
  fechaFinPersonalizada?: string,
): Promise<Contrato | null> => {
  try {
    const contratoActivo = await obtenerContratoActivoTrabajador(
      idTrabajador,
      idEmpresa,
    );

    if (!contratoActivo) {
      return null;
    }

    const fechaCese =
      fechaFinPersonalizada || new Date().toISOString().split("T")[0];

    const response = await api.put<Contrato>(
      `/api/contratos/${contratoActivo.id}/dar-baja`,
      null,
      {
        params: { fecha_fin: fechaCese },
      },
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al dar de baja el contrato activo del trabajador ${idTrabajador}.`,
    );
  }
};

/**
 * Elimina de forma masiva todos los registros contractuales de un trabajador dentro de una empresa concreta.
 * URI: DELETE /api/contratos/empresa/{idEmpresa}/trabajador/{idTrabajador}
 *
 * @async
 * @function eliminarTodosLosContratosTrabajador
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @param {string} idTrabajador - Identificador UUID único del trabajador.
 * @returns {Promise<void>} Promesa que se resuelve al completar la eliminación de los contratos.
 * @throws {Error} Lanza un error si falla el borrado en el servidor.
 */
export const eliminarTodosLosContratosTrabajador = async (
  idEmpresa: string,
  idTrabajador: string,
): Promise<void> => {
  try {
    await api.delete(
      `/api/contratos/empresa/${idEmpresa}/trabajador/${idTrabajador}`,
    );
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al eliminar los contratos del trabajador ${idTrabajador} en la empresa ${idEmpresa}.`,
    );
  }
};
