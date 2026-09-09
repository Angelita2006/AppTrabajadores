import { Platform } from "react-native";
import api from "../../../service/api/api";
import { Empresa } from "../../empresas/types/empresa";
import {
  Trabajador,
  TrabajadorCreate,
  TrabajadorUpdate,
} from "../types/trabajador";

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
): Promise<Trabajador[]> => {
  try {
    const respuesta = await api.get<Trabajador[]>(
      `/api/trabajadores/empresa/${idEmpresa}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        "Error al recuperar la plantilla de empleados de la empresa.",
    );
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
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al recuperar los detalles del trabajador.",
    );
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
    const respuesta = await api.post<Trabajador>("/api/trabajadores", payload);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al registrar el nuevo trabajador.");
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
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al actualizar el trabajador.");
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
  const formData = new FormData();

  if (Platform.OS === "web") {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    formData.append("file", blob, fileName);
  } else {
    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: fileType,
    } as any);
  }

  try {
    const response = await api.put<Trabajador>(
      `/api/trabajadores/${idTrabajador}/foto`,
      formData,
      {
        ...(Platform.OS === "web"
          ? { headers: { "Content-Type": "multipart/form-data" } }
          : {}),
      },
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      typeof apiMessage === "string"
        ? apiMessage
        : "Error al actualizar la foto de perfil.",
    );
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
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al recuperar la empresa del trabajador.",
    );
  }
};

/**
 * Elimina un trabajador de la plataforma validando privilegios de administración o empresa.
 * URI: DELETE /api/trabajadores/{id_trabajador}
 *
 * @async
 * @function eliminarTrabajador
 * @param {string} idTrabajador - Identificador único universal (UUID) del trabajador a eliminar.
 * @returns {Promise<{ detail: string }>} Promesa con el mensaje de confirmación de la eliminación.
 * @throws {Error} Lanza un error si el trabajador no existe o la API rechaza la petición.
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
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al eliminar el trabajador.");
  }
};

/**
 * Asigna turnos de forma masiva a un trabajador validando el ámbito de la empresa y los rangos de fechas opcionales.
 * URI: POST /api/trabajadores/turnos/{id_trabajador}
 *
 * @async
 * @function asignarTurnosTrabajador
 * @param {string} idTrabajador - Identificador único universal (UUID) del trabajador.
 * @param {string[]} turnos - Lista de identificadores únicos (UUIDs) de los turnos a asignar.
 * @param {string} [fechaInicio] - Fecha inicial de vigencia en formato "AAAA-MM-DD".
 * @param {string | null} [fechaFin] - Fecha final de vigencia opcional en formato "AAAA-MM-DD".
 * @returns {Promise<{ status: string; detail: string; trabajador_id: string; turnos_asignados: string[]; }>} Promesa con el resultado de la asignación.
 * @throws {Error} Lanza un error si ocurre un fallo durante la asignación de los turnos.
 */
export const asignarTurnosTrabajador = async (
  idTrabajador: string,
  turnos: string[],
  fechaInicio: string,
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
      `/api/trabajadores/turnos/${idTrabajador}`,
      payload,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al asignar los turnos al trabajador.");
  }
};

/**
 * Modifica los datos sobre una asignación de turno existente mediante parámetros en URL.
 * URI: PUT /api/asignaciones-turno/{id_asignacion}/editar
 *
 * @async
 * @function actualizarAsignacionTurno
 * @param {string} idAsignacion - Identificador único universal (UUID) de la asignación de turno.
 * @param {string} fechaInicio - Fecha de inicio de la asignación en formato "AAAA-MM-DD".
 * @param {string | null} fechaFin - Fecha de fin de la asignación opcional en formato "AAAA-MM-DD".
 * @returns {Promise<any>} Promesa con la respuesta de la edición de la asignación.
 * @throws {Error} Lanza un error si la actualización no se puede completar.
 */
export const actualizarAsignacionTurno = async (
  idAsignacion: string,
  fechaInicio: string,
  fechaFin: string | null,
): Promise<any> => {
  try {
    const params = new URLSearchParams();
    if (fechaFin) params.append("fecha_fin", fechaFin);
    if (fechaInicio) params.append("fecha_inicio", fechaInicio);

    const respuesta = await api.put(
      `/api/asignaciones-turno/${idAsignacion}/editar?${params.toString()}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al actualizar la asignación de turno.",
    );
  }
};
