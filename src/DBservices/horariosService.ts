import { Horario } from "../models/horarios";
import api from "./api";

const normalizeHorario = (horario: any): Horario => {
  if (!horario) return horario;
  return {
    ...horario,
    diasSemana: horario.diasSemana ?? horario.dias_semana,
    hora_entrada1: horario.hora_entrada1,
    hora_salida1: horario.hora_salida1,
    hora_entrada2: horario.hora_entrada2,
    hora_salida2: horario.hora_salida2,
  };
};

// crear un nuevo horario
export const crearHorario = async (
  idTrabajador: number,
  idEmpresa: number,
  tipoJornada: string,
  dias: number,
  diasSemana: string,
  hora_entrada1: string,
  hora_salida1: string,
  hora_entrada2: string | null,
  hora_salida2: string | null,
): Promise<Horario> => {
  try {
    const response = await api.post("/horario", {
      idTrabajador,
      idEmpresa,
      tipoJornada,
      dias,
      diasSemana,
      hora_entrada1,
      hora_salida1,
      hora_entrada2,
      hora_salida2,
    });
    return normalizeHorario(response.data);
  } catch (error) {
    console.error("Error creando horario:", error);
    throw error;
  }
};

// editar un horario existente
export const editarHorario = async (
  idHorario: number,
  idTrabajador: number,
  idEmpresa: number,
  tipoJornada: string,
  dias: number,
  diasSemana: string,
  hora_entrada1: string,
  hora_salida1: string,
  hora_entrada2: string | null,
  hora_salida2: string | null,
): Promise<Horario> => {
  try {
    const response = await api.put(`/horario/${idHorario}`, {
      idTrabajador,
      idEmpresa,
      tipoJornada,
      dias,
      diasSemana,
      hora_entrada1,
      hora_salida1,
      hora_entrada2,
      hora_salida2,
    });
    return normalizeHorario(response.data);
  } catch (error) {
    console.error("Error editando horario:", error);
    throw error;
  }
};

// eliminar un horario
export const eliminarHorario = async (idHorario: number): Promise<void> => {
  try {
    await api.delete(`/horario/${idHorario}`);
  } catch (error) {
    console.error("Error eliminando horario:", error);
    throw error;
  }
};

// obtener todos los horarios
export const obtenerHorarios = async (): Promise<Horario[]> => {
  try {
    const response = await api.get("/horarios");
    return response.data.map(normalizeHorario);
  } catch (error) {
    console.error("Error obteniendo horarios:", error);
    throw error;
  }
};

// obtener un horario por ID
export const obtenerHorario = async (idHorario: number): Promise<Horario> => {
  try {
    const response = await api.get(`/horario/${idHorario}`);
    return normalizeHorario(response.data);
  } catch (error) {
    console.error("Error obteniendo horario:", error);
    throw error;
  }
};

// obtener horario de un trabajador en una empresa específica
export const obtenerHorarioTrabajadorEmpresa = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Horario | null> => {
  try {
    const response = await api.get(
      `/horarios/trabajador/${idTrabajador}/empresa/${idEmpresa}`,
    );
    const horarios = (response.data as any[]).map(normalizeHorario);
    return horarios.length > 0 ? horarios[0] : null;
  } catch (error) {
    console.error(
      "Error obteniendo horario del trabajador en la empresa:",
      error,
    );
    throw error;
  }
};
