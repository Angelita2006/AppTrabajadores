import api from "@/src/service/api/api";
import { AuditoriaAccesoResponse } from "../types/auditoria-acceso";

/**
 * Servicio de consulta de auditoría de accesos.
 * Recupera eventos visibles para la empresa, trabajador o usuario indicado.
 */

/**
 * Obtiene los eventos de auditoría de una empresa.
 * URI: GET /api/auditoria-accesos/empresa/{id_empresa}
 *
 * @async
 * @function obtenerAuditoriaEmpresa
 * @param {string} idEmpresa - Identificador de la empresa.
 * @returns {Promise<AuditoriaAccesoResponse[]>} Eventos de auditoría de la empresa.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerAuditoriaEmpresa = async (
  idEmpresa: string,
  empresaIdContext: string = idEmpresa,
): Promise<AuditoriaAccesoResponse[]> => {
  try {
    const response = await api.get<AuditoriaAccesoResponse[]>(
      `/api/auditoria-accesos/empresa/${idEmpresa}`,
      { empresaIdContext } as any,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(apiMessage || "Error al obtener la auditoría de la empresa.");
  }
};

/**
 * Obtiene los eventos de auditoría asociados a un trabajador.
 * URI: GET /api/auditoria-accesos/trabajador/{id_trabajador}
 *
 * @async
 * @function obtenerAuditoriaTrabajador
 * @param {string} idTrabajador - Identificador del trabajador.
 * @returns {Promise<AuditoriaAccesoResponse[]>} Eventos de auditoría del trabajador.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerAuditoriaTrabajador = async (idTrabajador: string): Promise<AuditoriaAccesoResponse[]> => {
  try {
    const response = await api.get<AuditoriaAccesoResponse[]>(`/api/auditoria-accesos/trabajador/${idTrabajador}`);
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(apiMessage || "Error al obtener la auditoría del trabajador.");
  }
};

/**
 * Obtiene los eventos de auditoría asociados a un usuario.
 * URI: GET /api/auditoria-accesos/usuario/{id_usuario}
 *
 * @async
 * @function obtenerAuditoriaUsuario
 * @param {string} idUsuario - Identificador del usuario.
 * @returns {Promise<AuditoriaAccesoResponse[]>} Eventos de auditoría del usuario.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerAuditoriaUsuario = async (idUsuario: string): Promise<AuditoriaAccesoResponse[]> => {
  try {
    const response = await api.get<AuditoriaAccesoResponse[]>(`/api/auditoria-accesos/usuario/${idUsuario}`);
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(apiMessage || "Error al obtener la auditoría del usuario.");
  }
};
