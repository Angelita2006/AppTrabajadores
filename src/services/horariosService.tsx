import { getHorarioTrabajadorEmpresa } from "../APIservices/horariosService";
import { horarios } from "../mock/horariosMock";
import { Horario } from "../models/horarios";

// obtiene el horario de un trabajador en una empresa específica
export const obtenerHorarioTrabajadorEmpresa = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Horario | undefined> => {
  return await getHorarioTrabajadorEmpresa(idTrabajador, idEmpresa);
};

// obtiene todos los horarios
export const obtenerHorarios = (): Horario[] => {
  return horarios;
};
