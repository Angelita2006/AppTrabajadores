import { Horario } from "../models/horarios";
import api from "./api";

// Función para obtener el horario de un trabajador en una empresa
export const getHorarioTrabajadorEmpresa = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Horario> => {
  try {
    const res = await api.get(
      `/horarios?/trabajador/${idTrabajador}/empresa/${idEmpresa}`,
    );
    return res.data;
  } catch (error) {
    console.error("Error al obtener el horario:", error);
    throw error;
  }
};

// Función para obtener todos los horarios
export const obtenerHorarios = async (): Promise<Horario[]> => {
  const res = await api.get("/horarios");
  return res.data;
};

// Función para actualizar la información de un horario
export const updateHorario = async (idHorario: number): Promise<Horario> => {
  try {
    const res = await api.put(`/horarios/${idHorario}`, {});
    return res.data;
  } catch (error) {
    console.error("Error al actualizar el horario:", error);
    throw error;
  }
};
