import { Platform } from "react-native";
import api from "../../../service/api/api";
import { Empresa } from "../../empresas/types/empresa";
import {
  Estado,
  Trabajador,
  TrabajadorAutogestionUpdate,
  TrabajadorCreate,
  TrabajadorUpdate,
} from "../types/trabajador";

const mensajeErrorApi = (error: any, mensajeGenerico: string): Error =>
  new Error(
    error?.response?.data?.detail ||
      error?.response?.data?.message ||
      mensajeGenerico,
  );

/**
 * Servicio de Gestión de Trabajadores y Expedientes Laborales.
 * Contiene todas las operaciones CRUD y lógicas de negocio para el registro, consulta, edición, gestión de imágenes y asignación de turnos a empleados.
 */

/**
 * Obtiene la plantilla completa de empleados registrados en la empresa aplicando aislamiento multi-tenant.
 * URI: GET /api/trabajadores/empresa/{empresa_id}
 *
 * @async
 * @function obtenerTrabajadores
 * @param {string} idEmpresa - Identificador único universal (UUID) de la empresa.
 * @returns {Promise<Trabajador[]>} Promesa con el listado completo de empleados de la empresa.
 * @throws {Error} Lanza un error si ocurre un fallo al recuperar la plantilla.
 */
export const obtenerTrabajadores = async (
  idEmpresa: string,
  incluirInactivos = false,
): Promise<Trabajador[]> => {
  try {
    const respuesta = await api.get<Trabajador[]>(
      `/api/trabajadores/empresa/${idEmpresa}`,
      { params: { incluir_inactivos: incluirInactivos }, empresaIdContext: idEmpresa } as any,
    );
    return respuesta.data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al recuperar la plantilla de empleados de la empresa.");
  }
};
/**
 * Recupera la información detallada de un trabajador específico mediante su UUID.
 * URI: GET /api/trabajadores/{id_trabajador}
 *
 * @async
 * @function obtenerTrabajador
 * @param {string} idTrabajador - Identificador único universal (UUID) del trabajador.
 * @returns {Promise<Trabajador>} Promesa con los detalles del trabajador solicitado.
 * @throws {Error} Lanza un error si el trabajador no se encuentra.
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
    throw mensajeErrorApi(error, "Error al recuperar los detalles del trabajador.");
  }
};

/** Recupera el expediente laboral asociado al usuario autenticado. */
export const obtenerMiTrabajador = async (): Promise<Trabajador> => {
  try {
    const respuesta = await api.get<Trabajador>("/api/trabajadores/me");
    return respuesta.data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al recuperar tu ficha de trabajador.");
  }
};

/**
 * Actualiza los campos personales permitidos de la ficha laboral propia.
 * URI: PATCH /api/trabajadores/me
 * @async
 * @function modificarMiFichaTrabajador
 * @param {TrabajadorAutogestionUpdate} payload - Datos personales a actualizar.
 * @returns {Promise<Trabajador>} Ficha del trabajador actualizada.
 * @throws {Error} Mensaje de la API o error genérico de modificación.
 */
export const modificarMiFichaTrabajador = async (
  payload: TrabajadorAutogestionUpdate,
): Promise<Trabajador> => {
  try {
    const respuesta = await api.patch<Trabajador>(
      "/api/trabajadores/me",
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al actualizar tu ficha de trabajador.");
  }
};

/**
 * Registra un nuevo empleado en la base de datos de la plataforma.
 * URI: POST /api/trabajadores
 *
 * @async
 * @function crearTrabajador
 * @param {TrabajadorCreate} payload - Objeto con los datos necesarios para registrar el nuevo trabajador.
 * @returns {Promise<Trabajador>} Promesa con el expediente del trabajador recién creado.
 * @throws {Error} Lanza un error si los datos no son válidos o falla el registro.
 */
export const crearTrabajador = async (
  payload: TrabajadorCreate,
): Promise<Trabajador> => {
  try {
    const respuesta = await api.post<Trabajador>("/api/trabajadores", payload, {
      empresaIdContext: payload.empresa_id,
    } as any);
    return respuesta.data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al registrar el nuevo trabajador.");
  }
};

/**
 * Actualiza de forma parcial los datos de un trabajador existente.
 * URI: PATCH /api/trabajadores/{id_trabajador}
 *
 * @async
 * @function actualizarTrabajador
 * @param {string} idTrabajador - Identificador único universal (UUID) del trabajador a modificar.
 * @param {TrabajadorUpdate} payload - Objeto con los datos parciales a actualizar.
 * @returns {Promise<Trabajador>} Promesa con el expediente del trabajador actualizado.
 * @throws {Error} Lanza un error si la actualización no se puede completar.
 */
export const actualizarTrabajador = async (
  idTrabajador: string,
  payload: TrabajadorUpdate,
): Promise<Trabajador> => {
  try {
    const response = await api.patch<Trabajador>(
      `/api/trabajadores/${idTrabajador}`,
      payload,
    );
    return response.data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al actualizar el trabajador.");
  }
};
/**
 * Actualiza de forma independiente el estado operativo de un trabajador.
 * URI: PATCH /api/trabajadores/{id_trabajador}/estado
 *
 * @async
 * @function actualizarEstadoTrabajador
 * @param {string} idTrabajador - Identificador único universal (UUID) del trabajador.
 * @param {Estado} nuevoEstado - Nuevo estado operativo a aplicar.
 * @returns {Promise} Promesa con el expediente actualizado del trabajador.
 * @throws {Error} Lanza un error si la actualización de estado falla.
 */
export const actualizarEstadoTrabajador = async (
  idTrabajador: string,
  nuevoEstado: Estado,
): Promise<Trabajador> => {
  try {
    const response = await api.patch<Trabajador>(
      `/api/trabajadores/${idTrabajador}/estado`,
      { estado: nuevoEstado } satisfies TrabajadorUpdate,
    );
    return response.data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al actualizar el estado del trabajador.");
  }
};

/**
 * Actualiza la fotografía de perfil de un trabajador mediante un formato multipart/form-data compatible con Web y Móvil.
 * URI: PUT /api/trabajadores/{id_trabajador}/foto
 *
 * @async
 * @function actualizarFotoTrabajador
 * @param {string} idTrabajador - Identificador único universal (UUID) del trabajador.
 * @param {string} fileUri - URI local o remota del archivo de imagen.
 * @param {string} fileName - Nombre del archivo de imagen.
 * @param {string} fileType - Tipo MIME del archivo (ej. image/jpeg).
 * @returns {Promise<Trabajador>} Promesa con el expediente actualizado del trabajador.
 * @throws {Error} Lanza un error si el procesamiento de la imagen o la subida fallan.
 */
export const actualizarFotoTrabajador = async (
  idTrabajador: string,
  fileUri: string,
  fileName: string,
  fileType: string,
): Promise<Trabajador> => {
  try {
    const formData = new FormData();
    if (Platform.OS === "web") {
      const response = await fetch(fileUri);
      if (!response.ok) {
        throw new Error("No se pudo leer la imagen seleccionada.");
      }
      const blob = await response.blob();
      formData.append("file", blob, fileName);
    } else {
      formData.append("file", {
        uri: fileUri,
        name: fileName,
        type: fileType,
      } as any);
    }

    const response = await api.put<Trabajador>(
      `/api/trabajadores/${idTrabajador}/foto`,
      formData,
    );
    return response.data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al actualizar la foto de perfil.");
  }
};

/**
 * Recupera la empresa vinculada al expediente del trabajador validando permisos y token de acceso.
 * URI: GET /api/trabajadores/{id_trabajador}/empresa
 *
 * @async
 * @function obtenerEmpresaTrabajador
 * @param {string} idTrabajador - Identificador único universal (UUID) del trabajador.
 * @param {string} token - Token de autenticación Bearer de la sesión actual.
 * @returns {Promise<Empresa>} Promesa con la información de la empresa vinculada.
 * @throws {Error} Lanza un error si falla la recuperación de la empresa.
 */
export const obtenerEmpresaTrabajador = async (
  idTrabajador: string,
  token: string,
): Promise<Empresa> => {
  try {
    const respuesta = await api.get<Empresa>(
      `/api/trabajadores/${idTrabajador}/empresa`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return respuesta.data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al recuperar la empresa del trabajador.");
  }
};

/**
 * Tramita la baja total de un trabajador mediante una única petición atómica al backend.
 * URI: POST /api/trabajadores/{id_trabajador}/baja
 *
 * @async
 * @function tramitarBajaTotalTrabajador
 * @param {string} trabajadorId - Identificador único del trabajador.
 * @returns {Promise<{ detail: string }>} Confirmación de la baja tramitada.
 * @throws {Error} Mensaje de la API o error genérico de baja.
 */
export const tramitarBajaTotalTrabajador = async (
  trabajadorId: string,
): Promise<{ detail: string }> => {
  try {
    const respuesta = await api.post<{ detail: string }>(
      `/api/trabajadores/${trabajadorId}/baja`,
    );
    return respuesta.data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Ha ocurrido un error al tramitar la baja del trabajador.");
  }
};
