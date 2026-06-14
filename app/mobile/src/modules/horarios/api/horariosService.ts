import { Horario } from "@/modules/horarios/types/horario";
import { mockDb } from "@/services/api/mockDb";

export const crearHorario = async (): Promise<Horario> => {
  throw new Error("crearHorario no implementado en mock");
};

export const editarHorario = async (): Promise<Horario> => {
  throw new Error("editarHorario no implementado en mock");
};

export const eliminarHorario = async (): Promise<void> => undefined;

export const obtenerHorarios = async (): Promise<Horario[]> =>
  mockDb.getHorarios();

export const obtenerHorario = async (idHorario: number): Promise<Horario> => {
  const horarios = await mockDb.getHorarios();
  const horario = horarios.find((item) => item.id === idHorario);
  if (!horario) throw new Error("Horario no encontrado");
  return horario;
};

export const obtenerHorarioTrabajadorEmpresa = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Horario | null> =>
  mockDb.getHorarioTrabajadorEmpresa(idTrabajador, idEmpresa);
