import api from "../../../service/api/api";

/**
 * Obtiene el catálogo global de todas las empresas dadas de alta en la plataforma.
 */
export const obtenerEmpresas = async () => {
  const respuesta = await api.get("api/empresas");
  return respuesta.data;
};

/**
 * Recupera la información detallada de una empresa específica mediante su ID único.
 */
export const obtenerEmpresa = async (idEmpresa: number) => {
  const respuesta = await api.get(`api/empresas/${idEmpresa}`);
  return respuesta.data;
};

/**
 * Recupera la información detallada de una empresa específica mediante su ID único.
 */
export const obtenerEmpresaPorCif = async (cifEmpresa: number) => {
  const respuesta = await api.get(`api/empresas/cif/${cifEmpresa}`);
  return respuesta.data;
};

/**
 * Crea una nueva estructura de datos de empresa en la base de datos real del backend.
 */
export const crearEmpresa = async (data: {
  nombre: string;
  cif: string;
  direccion: string;
  codigo_postal: string;
  poblacion: string;
  provincia: string;
}) => {
  const respuesta = await api.post("api/empresas", data);
  return respuesta.data;
};

/**
 * Recupera el listado completo de empleados vinculados a un centro de trabajo específico.
 */
export const obtenerTrabajadoresEmpresa = async (idEmpresa: number) => {
  const respuesta = await api.get(`api/empresas/${idEmpresa}/trabajadores`);
  return respuesta.data;
};
