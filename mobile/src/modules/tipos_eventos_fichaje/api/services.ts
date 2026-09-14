import api from "@/src/service/api/api";
import {
  TipoEventoFichaje,
  TipoEventoFichajeCreate,
  TipoEventoFichajeUpdate,
} from "../types/tipos_evento_fichaje";

/**
 * Servicio de Gestión de Tipos de Eventos de Fichaje.
 * Contiene todas las operaciones CRUD y lógicas de negocio para el registro, consulta, edición y eliminación de las categorías o reglas de marcaje horario.
 */

/**
 * Obtiene el listado completo de tipos de eventos de fichaje registrados para una empresa específica aplicando aislamiento multi-tenant.
 * URI: GET /api/tipos-evento-fichaje/empresa/{empresa_id}
 *
 * @async
 * @function obtenerTiposEventosEmpresa
 * @param {string} idEmpresa - Identificador único universal (UUID) de la empresa.
 * @returns {Promise<TipoEventoFichaje[]>} Promesa con el listado de tipos de eventos de fichaje de la empresa.
 * @throws {Error} Lanza un error si ocurre un fallo al recuperar los tipos de eventos.
 */
export const obtenerTiposEventosEmpresa = async (
  idEmpresa: string,
): Promise<TipoEventoFichaje[]> => {
  try {
    const respuesta = await api.get<TipoEventoFichaje[]>(
      `/api/tipos-evento-fichaje/empresa/${idEmpresa}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al buscar los tipos de eventos de la empresa.",
    );
  }
};

/**
 * Recupera los atributos detallados de un tipo de evento de fichaje mediante su ID único universal.
 * URI: GET /api/tipos-evento-fichaje/{id_tipo_evento}
 *
 * @async
 * @function obtenerTipoEventoPorId
 * @param {string} idTipoEvento - Identificador único universal (UUID) del tipo de evento de fichaje.
 * @returns {Promise<TipoEventoFichaje>} Promesa con los detalles del tipo de evento solicitado.
 * @throws {Error} Lanza un error si el tipo de evento no se encuentra.
 */
export const obtenerTipoEventoPorId = async (
  idTipoEvento: string,
): Promise<TipoEventoFichaje> => {
  try {
    const respuesta = await api.get<TipoEventoFichaje>(
      `/api/tipos-evento-fichaje/${idTipoEvento}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al obtener el tipo de evento con ID ${idTipoEvento}.`,
    );
  }
};

/**
 * Busca una regla o tipo de marcaje de fichaje específico mediante su código clave único.
 * URI: GET /api/tipos-evento-fichaje/codigo/{codigo_clave}
 *
 * @async
 * @function obtenerTipoEventoPorCodigo
 * @param {string} codigoTipoEvento - Código identificativo del tipo de evento.
 * @returns {Promise<TipoEventoFichaje>} Promesa con el tipo de evento correspondiente al código.
 * @throws {Error} Lanza un error si no se encuentra ninguna coincidencia.
 */
export const obtenerTipoEventoPorCodigo = async (
  codigoTipoEvento: string,
): Promise<TipoEventoFichaje> => {
  try {
    const respuesta = await api.get<TipoEventoFichaje>(
      `/api/tipos-evento-fichaje/codigo/${codigoTipoEvento}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al buscar el tipo de evento con código '${codigoTipoEvento}'.`,
    );
  }
};

/**
 * Registra una nueva categoría de marcaje horario en el catálogo maestro.
 * URI: POST /api/tipos-evento-fichaje
 *
 * @async
 * @function crearTipoEventoFichaje
 * @param {TipoEventoFichajeCreate} payload - Objeto con los datos necesarios para registrar el nuevo tipo de evento.
 * @returns {Promise<TipoEventoFichaje>} Promesa con el tipo de evento de fichaje recién creado.
 * @throws {Error} Lanza un error si los datos no son válidos o falla el registro.
 */
export const crearTipoEventoFichaje = async (
  payload: TipoEventoFichajeCreate,
): Promise<TipoEventoFichaje> => {
  try {
    const respuesta = await api.post<TipoEventoFichaje>(
      "/api/tipos-evento-fichaje",
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Ha ocurrido un error al guardar el tipo de evento.",
    );
  }
};

/**
 * Actualiza parcialmente los atributos de una categoría de marcaje horario existente en el catálogo maestro.
 * URI: PUT /api/tipos-evento-fichaje/{id_tipo_evento}
 *
 * @async
 * @function actualizarTipoEventoFichaje
 * @param {string} idTipoEvento - Identificador único universal (UUID) del tipo de evento a modificar.
 * @param {TipoEventoFichajeUpdate} payload - Objeto con los datos parciales o totales a actualizar.
 * @returns {Promise<TipoEventoFichaje>} Promesa con el tipo de evento actualizado.
 * @throws {Error} Lanza un error si la actualización no se puede completar.
 */
export const actualizarTipoEventoFichaje = async (
  idTipoEvento: string,
  payload: TipoEventoFichajeUpdate,
): Promise<TipoEventoFichaje> => {
  try {
    const respuesta = await api.put<TipoEventoFichaje>(
      `/api/tipos-evento-fichaje/${idTipoEvento}`,
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Ha ocurrido un error al actualizar el tipo de evento.",
    );
  }
};

/**
 * Da de baja lógica una categoría o tipo de evento de fichaje del catálogo maestro mediante su ID único.
 * URI: PUT /api/tipos-evento-fichaje/{idTipoEvento}/desactivar
 *
 * @async
 * @function eliminarTipoEventoFichaje
 * @param {string} idTipoEvento - Identificador único universal (UUID) del tipo de evento a desactivar.
 * @returns {Promise<void>} Promesa vacía al completarse la desactivación de forma exitosa.
 * @throws {Error} Lanza un error si el registro no existe o la API rechaza la petición.
 */
export const eliminarTipoEventoFichaje = async (
  idTipoEvento: string,
): Promise<void> => {
  try {
    await api.put(`/api/tipos-evento-fichaje/${idTipoEvento}/desactivar`);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al desactivar el tipo de evento de fichaje.",
    );
  }
};
