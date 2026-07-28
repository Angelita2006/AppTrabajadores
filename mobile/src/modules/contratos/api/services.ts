import api from "@/src/service/api/api";
import { Contrato } from "../types/contrato";

/**
 * Recupera la secuencia histórica de contratos de un empleado.
 */
export const obtenerContratosTrabajador = async (
  idTrabajador: string,
): Promise<Contrato[]> => {
  try {
    const respuesta = await api.get<Contrato[]>(
      `/api/contratos/trabajador/${idTrabajador}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al obtener la secuencia histórica de contratos del trabajador ${idTrabajador}.`,
    );
  }
};

/**
 * Registra un nuevo contrato laboral asociándolo al expediente del empleado.
 */
export const crearContrato = async (data: {
  trabajador_id: string;
  empresa_id: string;
  centro_trabajo_id: string;
  tipo_contrato: string;
  tipo_jornada: string;
  horas_semana: number;
  fecha_inicio: string;
  departamento_id?: string | null;
  puesto_trabajo?: string | null;
  categoria_profesional?: string | null;
  fecha_fin?: string | null;
}): Promise<Contrato> => {
  try {
    const respuesta = await api.post<Contrato>("/api/contratos", data);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        "Error de integridad al registrar el nuevo contrato laboral.",
    );
  }
};

/**
 * Recupera el contrato activo de un empleado blindado por el ID de la empresa seleccionada.
 */
export const obtenerContratoActivoTrabajador = async (
  idTrabajador: string,
  idEmpresa: string,
): Promise<Contrato | null> => {
  try {
    const respuesta = await api.get<Contrato>(
      `/api/contratos/trabajador/${idTrabajador}/empresa/${idEmpresa}/activo`,
    );
    return respuesta.data || null;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al obtener el contrato activo del trabajador ${idTrabajador} en la empresa ${idEmpresa}.`,
    );
  }
};

/**
 * Rescinde el contrato activo de un empleado en la empresa seleccionada.
 */
export const rescindirContratoActivoTrabajador = async (
  idTrabajador: string,
  idEmpresa: string,
  fechaFinPersonalizada?: string,
): Promise<Contrato | null> => {
  try {
    const contrato = await obtenerContratoActivoTrabajador(
      idTrabajador,
      idEmpresa,
    );

    if (!contrato) {
      return null;
    }

    const fechaCese =
      fechaFinPersonalizada || new Date().toISOString().split("T")[0];
    const respuesta = await api.put<Contrato>(
      `/api/contratos/${contrato.id}/dar-baja`,
      null,
      {
        params: { fecha_fin: fechaCese },
      },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al dar de baja el contrato activo del trabajador ${idTrabajador}.`,
    );
  }
};

/**
 * Actualiza los datos de un contrato existente mediante un modelo de parcheo (Patch).
 */
export const actualizarContratoActivoTrabajador = async (
  idContrato: string,
  datos: {
    empresa_id?: string;
    centro_trabajo_id?: string;
    tipo_contrato?: string;
    tipo_jornada?: string;
    horas_semana?: number;
    fecha_inicio?: string;
    fecha_fin?: string | null;
    departamento_id?: string | null;
    puesto_trabajo?: string | null;
    categoria_profesional?: string | null;
    trabajador_id?: string;
  },
): Promise<Contrato> => {
  try {
    const respuesta = await api.put<Contrato>(
      `/api/contratos/${idContrato}`,
      datos,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || `Error al actualizar los datos del contrato ${idContrato}.`,
    );
  }
};

/**
 * Devuelve la lista global de contratos aplicando aislamiento multi-tenant.
 */
export const obtenerTodosLosContratos = async (): Promise<Contrato[]> => {
  try {
    const respuesta = await api.get<Contrato[]>("/api/contratos");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al obtener el listado global de contratos.",
    );
  }
};

/**
 * Obtiene los contratos asociados a una empresa concreta (tenant).
 */
export const obtenerContratosPorEmpresa = async (
  idEmpresa: string,
): Promise<Contrato[]> => {
  try {
    const respuesta = await api.get<Contrato[]>(
      `/api/contratos/empresa/${idEmpresa}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al obtener los contratos de la empresa ${idEmpresa}.`,
    );
  }
};

/**
 * Recupera la secuencia histórica de contratos de un empleado (Alias descriptivo).
 */
export const obtenerContratosPorTrabajador = async (
  idTrabajador: string,
): Promise<Contrato[]> => {
  return obtenerContratosTrabajador(idTrabajador);
};

/**
 * Elimina todos los registros de contratos asociados a un trabajador dentro de una empresa.
 */
export const eliminarTodosLosContratosTrabajador = async (
  empresaId: string,
  trabajadorId: string,
): Promise<void> => {
  try {
    await api.delete(
      `/api/contratos/empresa/${empresaId}/trabajador/${trabajadorId}`,
    );
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        `Error al eliminar los contratos del trabajador ${trabajadorId} en la empresa ${empresaId}.`,
    );
  }
};
