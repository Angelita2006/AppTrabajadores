import api from "../../../service/api/api";
import { Turno, TurnoCreate, TurnoUpdate } from "../types/turno";

/**
 * Registra un nuevo cuadrante de turno teórico.
 * URI: POST /api/turnos
 */
export const crearTurno = async (datosTurno: TurnoCreate): Promise<Turno> => {
  try {
    const respuesta = await api.post<Turno>("/api/turnos", {
      empresa_id: datosTurno.empresa_id,
      nombre: datosTurno.nombre,
      hora_inicio: datosTurno.hora_inicio,
      hora_fin: datosTurno.hora_fin,
      duracion_pausa_minutos: datosTurno.duracion_pausa_minutos ?? 0,
      dias_semana: datosTurno.dias_semana ?? [1, 2, 3, 4, 5],
      ...(datosTurno.color_hex !== undefined && {
        color_hex: datosTurno.color_hex,
      }),
    });
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(apiMessage || "Error al registrar el nuevo turno laboral.");
  }
};

/**
 * Devuelve el catálogo completo de turnos aplicando aislamiento multi-tenant.
 * URI: GET /api/turnos
 */
export const obtenerTodosLosTurnos = async (): Promise<Turno[]> => {
  try {
    const respuesta = await api.get<Turno[]>("/api/turnos");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(apiMessage || "Error al recuperar el catálogo de turnos.");
  }
};

/**
 * Recupera los cuadrantes horarios dados de alta por una organización específica.
 * URI: GET /api/turnos/empresa/{id_empresa}
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
 */
export const editarTurno = async (
  id_turno: string,
  data: TurnoUpdate,
): Promise<Turno> => {
  try {
    const response = await api.put<Turno>(
      `/api/turnos/${id_turno}/editar`,
      data,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.message;
    throw new Error(apiMessage || `Error al editar el turno ${id_turno}.`);
  }
};

/**
 * Elimina un turno físicamente de la base de datos (con efecto cascada).
 * URI: DELETE /api/turnos/{id_turno}
 */
export const eliminarTurno = async (
  id_turno: string,
): Promise<{ detail: string }> => {
  const response = await api.delete<{ detail: string }>(
    `/api/turnos/${id_turno}`,
  );
  return response.data;
};
