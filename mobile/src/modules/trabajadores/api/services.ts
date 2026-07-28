import api from "../../../service/api/api";
import { Empresa } from "../../empresas/types/empresa";
import {
  Trabajador,
  TrabajadorCreate,
  TrabajadorUpdate,
} from "../types/trabajador";

/**
 * Obtiene la plantilla completa de empleados registrados en el sistema SaaS aplicando aislamiento multi-tenant.
 */
export const obtenerTrabajadores = async (): Promise<Trabajador[]> => {
  try {
    const respuesta = await api.get<Trabajador[]>("/api/trabajadores");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al recuperar la plantilla de empleados del sistema.",
    );
  }
};

/**
 * Recupera la información detallada de un trabajador específico mediante su UUID.
 * @param idTrabajador Identificador único de tipo UUID (string)
 */
export const obtenerTrabajador = async (
  idTrabajador: string,
): Promise<Trabajador> => {
  try {
    const respuesta = await api.get<Trabajador>(
      `/api/trabajadores/${idTrabajador}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail || error.message;
    throw new Error(
      apiMessage || "Error al recuperar los detalles del trabajador.",
    );
  }
};

/**
 * Registra un nuevo empleado en la base de datos.
 */
export const crearTrabajador = async (
  data: TrabajadorCreate,
): Promise<Trabajador> => {
  try {
    const respuesta = await api.post<Trabajador>("/api/trabajadores", data);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(apiMessage || "Error al registrar el nuevo trabajador.");
  }
};

/**
 * Actualiza de forma parcial los datos de un trabajador.
 */
export const actualizarTrabajador = async (
  idTrabajador: string,
  datos: TrabajadorUpdate,
): Promise<Trabajador> => {
  try {
    const response = await api.patch<Trabajador>(
      `/api/trabajadores/${idTrabajador}`,
      datos,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(apiMessage || "Error al actualizar el trabajador.");
  }
};

/**
 * Recupera la empresa vinculada al expediente del trabajador validando permisos.
 */
export const obtenerEmpresasTrabajador = async (
  idTrabajador: string,
  token: string,
): Promise<Empresa[]> => {
  try {
    const respuesta = await api.get<Empresa[]>(
      `/api/trabajadores/${idTrabajador}/empresas`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al recuperar las empresas del trabajador.",
    );
  }
};

/**
 * Elimina un trabajador validando privilegios de administración o empresa.
 */
export const eliminarTrabajador = async (
  idTrabajador: string,
): Promise<{ detail: string }> => {
  try {
    const respuesta = await api.delete<{ detail: string }>(
      `/api/trabajadores/${idTrabajador}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(apiMessage || "Error al eliminar el trabajador.");
  }
};

/**
 * Asigna turnos masivamente a un trabajador validando el ámbito de la empresa.
 */
export const asignarTurnosTrabajador = async (
  idTrabajador: string,
  turnos: string[],
  fechaInicio?: string | null,
  fechaFin?: string | null,
): Promise<{
  status: string;
  detail: string;
  trabajador_id: string;
  turnos_asignados: string[];
}> => {
  try {
    const payload: any = {
      turnos,
      ...(fechaInicio && { fecha_inicio: fechaInicio }),
      ...(fechaFin && { fecha_fin: fechaFin }),
    };

    const respuesta = await api.post(
      `/api/trabajadores/${idTrabajador}/turnos`,
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(apiMessage || "Error al asignar los turnos al trabajador.");
  }
};
