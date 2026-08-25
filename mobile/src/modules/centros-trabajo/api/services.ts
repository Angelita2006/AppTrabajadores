import api from "@/src/service/api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CentroTrabajo,
  CentroTrabajoCreate,
  CentroTrabajoUpdate,
} from "../types/centro-trabajo";

/**
 * Registra un nuevo centro de trabajo.
 */
export const crearCentroTrabajo = async (
  datosCentro: CentroTrabajoCreate,
): Promise<CentroTrabajo> => {
  try {
    const respuesta = await api.post<CentroTrabajo>(
      "/api/centros-trabajo",
      datosCentro,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Ha ocurrido un error al crear el centro de trabajo.",
    );
  }
};

/**
 * Actualiza los datos de un centro de trabajo existente.
 * URI: PUT /api/centros-trabajo/{id_centro}/editar
 * @param idCentro UUID del centro de trabajo a modificar
 * @param datos Objeto parcial con los campos a actualizar
 */
export const editarCentroTrabajo = async (
  idCentro: string,
  datos: CentroTrabajoUpdate,
): Promise<CentroTrabajo> => {
  try {
    const respuesta = await api.put<CentroTrabajo>(
      `/api/centros-trabajo/${idCentro}/editar`,
      datos,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Error al editar el centro de trabajo ${idCentro}.`,
    );
  }
};

/**
 * Cambia el estado (activo/inactivo) de un centro de trabajo.
 */
export const cambiarEstadoCentroTrabajo = async (
  idCentro: string,
  activo: boolean,
): Promise<CentroTrabajo> => {
  try {
    const respuesta = await api.put<CentroTrabajo>(
      `/api/centros-trabajo/${idCentro}/estado`,
      null,
      {
        params: { activo },
      },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al cambiar el estado del centro de trabajo ${idCentro}.`,
    );
  }
};

/**
 * Recupera un Centro de Trabajo específico desde PostgreSQL por su ID único.
 */
export const obtenerCentroTrabajo = async (
  centroTrabajoId: string,
): Promise<CentroTrabajo> => {
  try {
    const respuesta = await api.get<CentroTrabajo>(
      `/api/centros-trabajo/${centroTrabajoId}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Centro de trabajo con ID ${centroTrabajoId} no encontrado.`,
    );
  }
};

/**
 * Obtiene la lista de centros de trabajo vinculados a una empresa específica.
 */
export const obtenerCentrosPorEmpresa = async (
  idEmpresa: string,
): Promise<CentroTrabajo[]> => {
  try {
    const token = await AsyncStorage.getItem("user_token");
    const respuesta = await api.get<CentroTrabajo[]>(
      `/api/centros-trabajo/empresa/${idEmpresa}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al recuperar centros de trabajo de la empresa ${idEmpresa}.`,
    );
  }
};

/**
 * Elimina un centro de trabajo de la base de datos.
 * @param centroId - UUID del centro a eliminar.
 */
export const eliminarCentroTrabajo = async (
  centroId: string,
): Promise<void> => {
  await api.delete(`/api/centros-trabajo/${centroId}`);
};
