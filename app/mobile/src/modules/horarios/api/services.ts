import api from "../../../services/api/api.js";

/**
 * Consulta y extrae la planificación semanal global absoluta de todo el sistema.
 */
export const obtenerHorarios = async () => {
  const respuesta = await api.get("/horarios");
  return respuesta.data;
};

/**
 * Recupera un cuadrante de horario específico utilizando su identificador único.
 */
export const obtenerHorario = async (idHorario: number) => {
  const respuesta = await api.get(`/horarios/${idHorario}`);
  return respuesta.data;
};

/**
 * Consulta el cuadrante de turnos asignado a un trabajador dentro de una empresa concreta.
 */
export const obtenerHorarioTrabajadorEmpresa = async (
  idTrabajador: number,
  idEmpresa: number,
) => {
  const respuesta = await api.get(
    `/horarios/trabajador/${idTrabajador}/empresa/${idEmpresa}`,
  );
  return respuesta.data;
};

/**
 * Asigna un nuevo cuadrante de horarios a un trabajador dentro de una empresa determinada.
 */
export const crearHorario = async (data: {
  idTrabajador: number;
  idEmpresa: number;
  tipoJornada: string;
  dias: number;
  diasSemana: string;
  hora_entrada1: string;
  hora_salida1: string;
  hora_entrada2?: string;
  hora_salida2?: string;
}) => {
  const respuesta = await api.post("/horarios", data);
  return respuesta.data;
};

/**
 * Elimina un cuadrante de horario específico del sistema mediante su ID único.
 */
export const eliminarHorario = async (idHorario: number) => {
  const respuesta = await api.delete(`/horarios/${idHorario}`);
  return respuesta.data;
};
