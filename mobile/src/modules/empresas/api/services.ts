import api from "../../../service/api/api";
import { Empresa, EmpresaUpdate } from "../types/empresa";

/**
 * Obtiene el catálogo global de todas las empresas dadas de alta en la plataforma.
 */
export const obtenerEmpresas = async (): Promise<Empresa[]> => {
  try {
    const respuesta = await api.get<Empresa[]>("/api/empresas");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(apiMessage || "Error al obtener el catálogo de empresas.");
  }
};

/**
 * Recupera la información detallada de una empresa específica mediante su ID único.
 */
export const obtenerEmpresa = async (idEmpresa: string): Promise<Empresa> => {
  try {
    const respuesta = await api.get<Empresa>(`/api/empresas/${idEmpresa}`);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al recuperar la información de la empresa.",
    );
  }
};

/**
 * Recupera la información detallada de una empresa específica mediante su CIF.
 */
export const obtenerEmpresaPorCif = async (
  cifEmpresa: string,
): Promise<Empresa> => {
  try {
    const respuesta = await api.get<Empresa>(`/api/empresas/cif/${cifEmpresa}`);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(apiMessage || "Error al buscar la empresa por su CIF.");
  }
};

/**
 * Crea una nueva estructura de datos de empresa en la base de datos real del backend.
 */
export const crearEmpresa = async (data: {
  razon_social: string;
  cif: string;
  nombre_comercial?: string | null;
  zona_horaria?: string;
  configuracion?: Record<string, any>;
  codigo_cnae?: string | null;
  convenio_colectivo?: string | null;
  direccion_fiscal?: string | null;
}): Promise<Empresa> => {
  try {
    const respuesta = await api.post<Empresa>("/api/empresas", data);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(apiMessage || "Error al registrar la nueva empresa.");
  }
};

/**
 * Recupera el listado completo de empleados vinculados a una empresa específica.
 */
export const obtenerTrabajadoresEmpresa = async (
  idEmpresa: string,
): Promise<any[]> => {
  try {
    const respuesta = await api.get<any[]>(
      `/api/empresas/${idEmpresa}/trabajadores`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al obtener los trabajadores de la empresa.",
    );
  }
};

/**
 * Modifica la razón social de una empresa existente mediante Query Params.
 */
export const cambiarRazonSocialEmpresa = async (
  idEmpresa: string,
  nuevaRazonSocial: string,
): Promise<Empresa> => {
  try {
    const respuesta = await api.put<Empresa>(
      `/api/empresas/${idEmpresa}/razon-social`,
      null,
      {
        params: {
          nueva_razon_social: nuevaRazonSocial,
        },
      },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(apiMessage || "Error al actualizar la razón social.");
  }
};

/**
 * Actualiza los datos de una empresa existente usando un objeto parcial de actualización.
 */
export const actualizarDatosEmpresa = async (
  idEmpresa: string,
  payload: EmpresaUpdate,
): Promise<Empresa> => {
  try {
    const respuesta = await api.put<Empresa>(
      `/api/empresas/${idEmpresa}`,
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al actualizar los datos de la empresa.",
    );
  }
};

/**
 * Guarda o actualiza de manera integral los datos corporativos, fiscales y de convenio de la empresa.
 */
export const guardarDatosEmpresa = async (
  idEmpresa: string,
  razonSocial: string,
  convenioColectivo: string,
  codigoCnae: string,
  direccionFiscal: string,
): Promise<Empresa> => {
  try {
    const payload: EmpresaUpdate = {
      razon_social: razonSocial,
      convenio_colectivo: convenioColectivo,
      codigo_cnae: codigoCnae,
      direccion_fiscal: direccionFiscal,
    };
    const respuesta = await api.put<Empresa>(
      `/api/empresas/${idEmpresa}`,
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(apiMessage || "Error al guardar los datos de la empresa.");
  }
};
