import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import api from "../../../service/api/api";
import { Empresa, EmpresaUpdate } from "../types/empresa";

/**
 * Servicio de Gestión de Empresas (Tenants).
 * Contiene todas las operaciones CRUD y lógicas de negocio para la consulta, registro, actualización de datos corporativos, gestión de logos y vinculación de trabajadores en la plataforma SaaS.
 */

/**
 * Obtiene el catálogo global de todas las empresas dadas de alta en la plataforma.
 * URI: GET /api/empresas
 *
 * @async
 * @function obtenerEmpresas
 * @returns {Promise<Empresa[]>} Promesa con el listado completo de empresas.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener el catálogo de empresas.
 */
export const obtenerEmpresas = async (): Promise<Empresa[]> => {
  try {
    const respuesta = await api.get<Empresa[]>("/api/empresas");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al obtener el catálogo de empresas.");
  }
};

/**
 * Recupera la información detallada de una empresa específica mediante su ID único.
 * URI: GET /api/empresas/{id_empresa}
 *
 * @async
 * @function obtenerEmpresa
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @returns {Promise<Empresa>} Promesa con los detalles de la empresa solicitada.
 * @throws {Error} Lanza un error si la empresa no se encuentra o falla la recuperación.
 */
export const obtenerEmpresa = async (idEmpresa: string): Promise<Empresa> => {
  try {
    const respuesta = await api.get<Empresa>(`/api/empresas/${idEmpresa}`);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al recuperar la información de la empresa.",
    );
  }
};

/**
 * Recupera la información detallada de una empresa específica mediante su CIF.
 * URI: GET /api/empresas/cif/{cif_empresa}
 *
 * @async
 * @function obtenerEmpresaPorCif
 * @param {string} cifEmpresa - Código de Identificación Fiscal (CIF) de la empresa.
 * @returns {Promise<Empresa>} Promesa con los detalles de la empresa encontrada.
 * @throws {Error} Lanza un error si no se encuentra ninguna empresa con el CIF indicado.
 */
export const obtenerEmpresaPorCif = async (
  cifEmpresa: string,
): Promise<Empresa> => {
  try {
    const respuesta = await api.get<Empresa>(`/api/empresas/cif/${cifEmpresa}`);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al buscar la empresa por su CIF.");
  }
};

/**
 * Recupera el listado completo de empleados vinculados a una empresa específica.
 * URI: GET /api/empresas/{id_empresa}/trabajadores
 *
 * @async
 * @function obtenerTrabajadoresEmpresa
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @returns {Promise<any[]>} Promesa con el listado de trabajadores vinculados.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener los trabajadores de la empresa.
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
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al obtener los trabajadores de la empresa.",
    );
  }
};

/**
 * Crea una nueva estructura de datos de empresa en la base de datos del backend.
 * URI: POST /api/empresas
 *
 * @async
 * @function crearEmpresa
 * @param {object} payload - Objeto con los datos necesarios para registrar la nueva empresa.
 * @returns {Promise<Empresa>} Promesa con la empresa recién creada.
 * @throws {Error} Lanza un error si los datos no son válidos o falla el registro.
 */
export const crearEmpresa = async (payload: {
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
    const respuesta = await api.post<Empresa>("/api/empresas", payload);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al registrar la nueva empresa.");
  }
};

/**
 * Modifica la razón social de una empresa existente mediante parámetros en la URL (Query Params).
 * URI: PUT /api/empresas/{id_empresa}/razon-social
 *
 * @async
 * @function cambiarRazonSocialEmpresa
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @param {string} nuevaRazonSocial - Nueva razón social a actualizar.
 * @returns {Promise<Empresa>} Promesa con la empresa actualizada.
 * @throws {Error} Lanza un error si el registro no existe o la API rechaza la actualización.
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
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al actualizar la razón social.");
  }
};

/**
 * Actualiza los datos de una empresa existente usando un objeto parcial de actualización.
 * URI: PUT /api/empresas/{id_empresa}
 *
 * @async
 * @function actualizarDatosEmpresa
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @param {EmpresaUpdate} payload - Objeto con los campos parciales a actualizar según la interfaz EmpresaUpdate.
 * @returns {Promise<Empresa>} Promesa con los datos de la empresa actualizados.
 * @throws {Error} Lanza un error si los datos no son válidos o falla la actualización.
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
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al actualizar los datos de la empresa.",
    );
  }
};

/**
 * Guarda o actualiza de manera integral los datos corporativos, fiscales y de convenio de la empresa,
 * cumpliendo estrictamente con los campos requeridos y opcionales definidos en el esquema `EmpresaUpdate`.
 * URI: PUT /api/empresas/{id_empresa}
 *
 * @async
 * @function guardarDatosEmpresa
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @param {string} razonSocial - Nueva razón social de la empresa.
 * @param {string} cif - CIF actual o actualizado de la empresa.
 * @param {string} zonaHoraria - Zona horaria configurada.
 * @param {boolean} activo - Estado de activación de la empresa.
 * @param {string} nombreComercial - Nombre comercial de la empresa.
 * @param {string} convenioColectivo - Convenio colectivo aplicable.
 * @param {string} codigoCnae - Código CNAE de la actividad.
 * @param {string} direccionFiscal - Dirección fiscal completa.
 * @returns {Promise<Empresa>} Promesa con los datos de la empresa guardados.
 * @throws {Error} Lanza un error si ocurre un fallo al guardar los datos.
 */
export const guardarDatosEmpresa = async (
  idEmpresa: string,
  razonSocial: string,
  cif: string,
  zonaHoraria: string,
  activo: boolean,
  nombreComercial: string,
  convenioColectivo: string,
  codigoCnae: string,
  direccionFiscal: string,
): Promise<Empresa> => {
  try {
    const payload: EmpresaUpdate = {
      razon_social: razonSocial,
      cif: cif,
      zona_horaria: zonaHoraria,
      activo: activo,
      nombre_comercial: nombreComercial,
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
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al guardar los datos de la empresa.");
  }
};

/**
 * Actualiza específicamente el logo corporativo de una empresa existente mediante FormData.
 * URI: PUT /api/empresas/{id_empresa}/logo
 *
 * @async
 * @function actualizarLogoEmpresa
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @param {string} fileUri - URI local o ruta del archivo de imagen del logo.
 * @returns {Promise<Empresa>} Promesa con la empresa actualizada incluyendo la referencia del nuevo logo.
 * @throws {Error} Lanza un error si la subida del archivo falla o la API rechaza la imagen.
 */
export const actualizarLogoEmpresa = async (
  idEmpresa: string,
  fileUri: string,
): Promise<Empresa> => {
  try {
    const formData = new FormData();

    const filename = fileUri.split("/").pop() || "logo.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    if (Platform.OS === "web") {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      formData.append("file", blob, filename);
    } else {
      formData.append("file", {
        uri: fileUri,
        name: filename,
        type,
      } as any);
    }

    const respuesta = await api.put<Empresa>(
      `/api/empresas/${idEmpresa}/logo`,
      formData,
      {
        ...(Platform.OS === "web"
          ? { headers: { "Content-Type": "multipart/form-data" } }
          : {}),
      },
    );

    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al actualizar el logo de la empresa.");
  }
};

/**
 * Construye y devuelve la URL absoluta accesible para visualizar el logo
 * o archivos protegidos de la empresa según la plataforma (Web o Móvil).
 */
export const obtenerUrlLogo = async (
  logoUrl?: string | null,
): Promise<string | null> => {
  if (!logoUrl) return null;

  // Si ya es una URL absoluta externa, la devolvemos tal cual
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return logoUrl;
  }

  // Transformamos /static/ a /api/archivos/ para que apunte al endpoint protegido
  let rutaModificada = logoUrl;
  if (rutaModificada.startsWith("/static/")) {
    rutaModificada = rutaModificada.replace("/static/", "/api/archivos/");
  } else if (!rutaModificada.startsWith("/api/archivos/")) {
    rutaModificada = `/api/archivos${rutaModificada.startsWith("/") ? "" : "/"}${rutaModificada}`;
  }

  // Determinamos la URL base unificada de Axios
  const baseURL = api.defaults.baseURL;
  if (!baseURL) return null;

  const cleanBase = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
  const cleanPath = rutaModificada.startsWith("/")
    ? rutaModificada
    : `/${rutaModificada}`;

  let urlFinal = `${cleanBase}${cleanPath}`;

  const token = await AsyncStorage.getItem("user_token");
  // Si tenemos un token, lo adjuntamos como query param para que el endpoint protegido pueda validarlo
  if (token) {
    const separador = urlFinal.includes("?") ? "&" : "?";
    urlFinal = `${urlFinal}${separador}token=${token}`;
  }

  return urlFinal;
};
