// import { getHorarioTrabajadorEmpresa } from "../APIservices/horariosService";
import { horarios } from "../mock/horariosMock";
import { Horario } from "../models/horarios";

// obtiene el horario de un trabajador en una empresa específica
export const obtenerHorarioTrabajadorEmpresa = (
  idTrabajador: number,
  idEmpresa: number,
): Horario => {
  return horarios.find(
    (h) => h.idTrabajador === idTrabajador && h.idEmpresa === idEmpresa,
  ) as Horario;
};

// obtiene todos los horarios
export const obtenerHorarios = (): Horario[] => {
  return horarios;
};
