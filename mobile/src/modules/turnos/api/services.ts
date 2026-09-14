import api from "../../../service/api/api";
import { Turno, TurnoCreate, TurnoUpdate } from "../types/turno";

/**
 * Servicio de Gestión de Turnos Laborales.
 * Contiene todas las operaciones CRUD y lógicas de negocio para el registro, consulta, edición y eliminación de turnos.
 */

/**
 * Devuelve el catálogo completo de turnos aplicando aislamiento multi-tenant.
 * URI: GET /api/turnos
 *
 * @async
 * @function obtenerTodosLosTurnos
 * @returns {Promise<Turno[]>} Promesa con el catálogo completo de turnos.
 * @throws {Error} Lanza un error si ocurre un fallo al recuperar el catálogo.
 */
export const obtenerTodosLosTurnos = async (): Promise<Turno[]> => {
  try {
    const respuesta = await api.get<Turno[]>("/api/turnos");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(apiMessage || "Error al recuperar el catálogo de turnos.");
  }
};

/**
 * Registra un nuevo cuadrante de turno teórico.
 * URI: POST /api/turnos
 *
 * @async
 * @function crearTurno
 * @param {TurnoCreate} payload - Objeto con los datos necesarios para registrar el nuevo turno.
 * @returns {Promise<Turno>} Promesa con el turno laboral recién creado.
 * @throws {Error} Lanza un error si los datos no son válidos o falla el registro.
 */
export const crearTurno = async (payload: TurnoCreate): Promise<Turno> => {
  try {
    const respuesta = await api.post<Turno>("/api/turnos", {
      empresa_id: payload.empresa_id,
      nombre: payload.nombre,
      hora_inicio: payload.hora_inicio,
      hora_fin: payload.hora_fin,
      duracion_pausa_minutos: payload.duracion_pausa_minutos ?? 0,
      dias_semana: payload.dias_semana ?? [1, 2, 3, 4, 5],
    });
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(apiMessage || "Error al registrar el nuevo turno laboral.");
  }
};

/**
 * Recupera los cuadrantes horarios dados de alta por una organización específica.
 * URI: GET /api/turnos/empresa/{id_empresa}
 *
 * @async
 * @function obtenerTurnosEmpresa
 * @param {string} idEmpresa - Identificador único universal (UUID) de la empresa.
 * @returns {Promise<Turno[]>} Promesa con el listado de turnos de la empresa.
 * @throws {Error} Lanza un error si la empresa no existe o falla la recuperación.
 */
export const obtenerTurnosEmpresa = async (
  idEmpresa: string,
): Promise<Turno[]> => {
  try {
    const respuesta = await api.get<Turno[]>(
      `/api/turnos/empresa/${idEmpresa}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(
      apiMessage || "Error al recuperar los turnos de la empresa.",
    );
  }
};

/**
 * Obtiene los detalles maestros de un turno mediante su ID.
 * URI: GET /api/turnos/{id_turno}
 *
 * @async
 * @function obtenerTurnoPorId
 * @param {string} idTurno - Identificador único universal (UUID) del turno.
 * @returns {Promise<Turno>} Promesa con los detalles del turno solicitado.
 * @throws {Error} Lanza un error si el turno no se encuentra.
 */
export const obtenerTurnoPorId = async (idTurno: string): Promise<Turno> => {
  try {
    const respuesta = await api.get<Turno>(`/api/turnos/${idTurno}`);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(apiMessage || `Error al obtener el turno ${idTurno}.`);
  }
};

/**
 * Modifica las propiedades de un turno existente.
 * URI: PUT /api/turnos/{id_turno}/editar
 *
 * @async
 * @function editarTurno
 * @param {string} idTurno - Identificador único universal (UUID) del turno a modificar.
 * @param {TurnoUpdate} payload - Objeto con los datos parciales o totales a actualizar.
 * @returns {Promise<Turno>} Promesa con el turno actualizado.
 * @throws {Error} Lanza un error si la actualización no se puede completar.
 */
export const editarTurno = async (
  idTurno: string,
  payload: TurnoUpdate,
): Promise<Turno> => {
  try {
    const response = await api.put<Turno>(
      `/api/turnos/${idTurno}/editar`,
      payload,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(apiMessage || `Error al editar el turno ${idTurno}.`);
  }
};

/**
 * Da de baja un turno laboral del sistema.
 * URI: PUT /api/turnos/{idTurno}/desactivar
 *
 * @async
 * @function eliminarTurno
 * @param {string} idTurno - Identificador único universal (UUID) del turno a desactivar.
 * @returns {Promise<{ detail: string }>} Promesa con el mensaje de confirmación de la desactivación.
 * @throws {Error} Lanza un error si el turno no existe o la API rechaza la petición.
 */
export const eliminarTurno = async (
  idTurno: string,
): Promise<{ detail: string }> => {
  try {
    const response = await api.put<{ detail: string }>(
      `/api/turnos/${idTurno}/desactivar`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(apiMessage || `Error al desactivar el turno ${idTurno}.`);
  }
};
