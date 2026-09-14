import api from "@/src/service/api/api";
import {
  CentroTrabajo,
  CentroTrabajoCreate,
  CentroTrabajoUpdate,
} from "../types/centro-trabajo";

/**
 * Registra un nuevo centro de trabajo o sede física en el sistema.
 * URI: POST /api/centros-trabajo
 *
 * @async
 * @function crearCentroTrabajo
 * @param {CentroTrabajoCreate} payload - Objeto con los datos requeridos para dar de alta el centro de trabajo.
 * @returns {Promise<CentroTrabajo>} Promesa con el objeto `CentroTrabajo` recién creado.
 * @throws {Error} Lanza un error si falla la creación o existen inconsistencias en los datos proporcionados.
 */
export const crearCentroTrabajo = async (
  payload: CentroTrabajoCreate,
): Promise<CentroTrabajo> => {
  try {
    const response = await api.post<CentroTrabajo>(
      "/api/centros-trabajo",
      payload,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Ha ocurrido un error al crear el centro de trabajo.",
    );
  }
};

/**
 * Obtiene el listado global de todos los centros de trabajo registrados en el sistema.
 * URI: GET /api/centros-trabajo
 *
 * @async
 * @function obtenerTodosLosCentrosTrabajo
 * @returns {Promise<CentroTrabajo[]>} Promesa con el listado global de centros de trabajo.
 * @throws {Error} Lanza un error si ocurre un fallo al realizar la consulta al servidor.
 */
export const obtenerTodosLosCentrosTrabajo = async (): Promise<
  CentroTrabajo[]
> => {
  try {
    const response = await api.get<CentroTrabajo[]>("/api/centros-trabajo");
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener el listado global de centros de trabajo.",
    );
  }
};

/**
 * Recupera el listado de centros de trabajo asociados a una empresa u organización específica.
 * URI: GET /api/centros-trabajo/empresa/{idEmpresa}
 *
 * @async
 * @function obtenerCentrosTrabajoPorEmpresa
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @returns {Promise<CentroTrabajo[]>} Promesa con la lista de centros vinculados a la empresa.
 * @throws {Error} Lanza un error si falla la recuperación de los centros de la empresa.
 */
export const obtenerCentrosTrabajoPorEmpresa = async (
  idEmpresa: string,
): Promise<CentroTrabajo[]> => {
  try {
    const response = await api.get<CentroTrabajo[]>(
      `/api/centros-trabajo/empresa/${idEmpresa}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al recuperar centros de trabajo de la empresa ${idEmpresa}.`,
    );
  }
};

/**
 * Recupera un centro de trabajo específico por su identificador único.
 * URI: GET /api/centros-trabajo/{idCentro}
 *
 * @async
 * @function obtenerCentroTrabajo
 * @param {string} idCentro - Identificador UUID único del centro de trabajo.
 * @returns {Promise<CentroTrabajo>} Promesa con la entidad `CentroTrabajo` encontrada.
 * @throws {Error} Lanza un error si el centro no existe o falla la consulta.
 */
export const obtenerCentroTrabajo = async (
  idCentro: string,
): Promise<CentroTrabajo> => {
  try {
    const response = await api.get<CentroTrabajo>(
      `/api/centros-trabajo/${idCentro}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Centro de trabajo con ID ${idCentro} no encontrado.`,
    );
  }
};

/**
 * Actualiza parcialmente los atributos de un centro de trabajo existente mediante su identificador único.
 * URI: PUT /api/centros-trabajo/{idCentro}/editar
 *
 * @async
 * @function actualizarCentroTrabajo
 * @param {string} idCentro - Identificador UUID único del centro de trabajo a modificar.
 * @param {CentroTrabajoUpdate} payload - Objeto con los parámetros opcionales a actualizar.
 * @returns {Promise<CentroTrabajo>} Promesa con la entidad `CentroTrabajo` actualizada.
 * @throws {Error} Lanza un error si el centro no existe o la actualización es rechazada.
 */
export const actualizarCentroTrabajo = async (
  idCentro: string,
  payload: CentroTrabajoUpdate,
): Promise<CentroTrabajo> => {
  try {
    const response = await api.put<CentroTrabajo>(
      `/api/centros-trabajo/${idCentro}/editar`,
      payload,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Error al editar el centro de trabajo ${idCentro}.`,
    );
  }
};

/**
 * Cambia el estado de operatividad (activo/inactivo) de un centro de trabajo.
 * URI: PUT /api/centros-trabajo/{idCentro}/estado?activo=...
 *
 * @async
 * @function cambiarEstadoCentroTrabajo
 * @param {string} idCentro - Identificador UUID único del centro de trabajo.
 * @param {boolean} activo - Nuevo estado booleano a aplicar.
 * @returns {Promise<CentroTrabajo>} Promesa con el centro de trabajo actualizado.
 * @throws {Error} Lanza un error si ocurre un fallo durante el cambio de estado.
 */
export const cambiarEstadoCentroTrabajo = async (
  idCentro: string,
  activo: boolean,
): Promise<CentroTrabajo> => {
  try {
    const response = await api.put<CentroTrabajo>(
      `/api/centros-trabajo/${idCentro}/estado`,
      null,
      {
        params: { activo },
      },
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al cambiar el estado del centro de trabajo ${idCentro}.`,
    );
  }
};

/**
 * Da de baja un centro de trabajo por su identificador único.
 * URI: PUT /api/centros-trabajo/{idCentro}/desactivar
 *
 * @async
 * @function eliminarCentroTrabajo
 * @param {string} idCentro - Identificador UUID único del centro a desactivar.
 * @returns {Promise<void>} Promesa que se resuelve al completar la desactivación.
 * @throws {Error} Lanza un error si el centro no existe o falla la operación.
 */
export const eliminarCentroTrabajo = async (
  idCentro: string,
): Promise<void> => {
  try {
    await api.put(`/api/centros-trabajo/${idCentro}/desactivar`);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Error al desactivar el centro de trabajo ${idCentro}.`,
    );
  }
};
