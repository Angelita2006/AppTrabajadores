import api from "@/src/service/api/api";
import {
  TipoEventoFichaje,
  TipoEventoFichajeCreate,
} from "../types/tipos_evento_fichaje";

/**
 * Registra una nueva categoría de marcaje horario en el catálogo maestro.
 * Exclusivo para administradores.
 */
export const crearTipoEventoFichaje = async (
  data: TipoEventoFichajeCreate,
): Promise<TipoEventoFichaje> => {
  try {
    const respuesta = await api.post<TipoEventoFichaje>(
      "/api/tipos-evento-fichaje",
      data,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(
      apiMessage || "Ha ocurrido un error al guardar el tipo de evento.",
    );
  }
};

/**
 * Actualiza una categoría de marcaje horario existente en el catálogo maestro.
 * Exclusivo para administradores.
 */
export const actualizarTipoEventoFichaje = async (
  idTipoEvento: string,
  data: TipoEventoFichajeCreate,
): Promise<TipoEventoFichaje> => {
  try {
    const respuesta = await api.put<TipoEventoFichaje>(
      `/api/tipos-evento-fichaje/${idTipoEvento}`,
      data,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(
      apiMessage || "Ha ocurrido un error al actualizar el tipo de evento.",
    );
  }
};

/**
 * Elimina una categoría de marcaje del catálogo maestro mediante su ID único.
 * Exclusivo para administradores.
 */
export const eliminarTipoEventoFichaje = async (
  idTipoEvento: string,
): Promise<void> => {
  try {
    await api.delete(`/api/tipos-evento-fichaje/${idTipoEvento}`);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al eliminar el tipo de evento de fichaje.",
    );
  }
};

/**
 * Busca los atributos de un tipo de marcaje por su ID único.
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
    const apiMessage = error?.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al obtener el tipo de evento con ID ${idTipoEvento}.`,
    );
  }
};

/**
 * Busca una regla de marcaje específica por su código clave.
 */
export const obtenerTipoEventoPorCodigo = async (
  codigoClave: string,
): Promise<TipoEventoFichaje> => {
  try {
    const respuesta = await api.get<TipoEventoFichaje>(
      `/api/tipos-evento-fichaje/codigo/${codigoClave}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al buscar el tipo de evento con código '${codigoClave}'.`,
    );
  }
};

export const obtenerTiposEventosEmpresa = async (
  empresaId: string,
): Promise<TipoEventoFichaje[]> => {
  try {
    const respuesta = await api.get<TipoEventoFichaje[]>(
      `/api/tipos-evento-fichaje/empresa/${empresaId}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(
      apiMessage || `Error al buscar los tipos de eventos de la empresa.`,
    );
  }
};
