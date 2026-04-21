import { getHorarioTrabajadorEmpresa } from "../services/horariosService";

// let idsHorarios = 0;

const horarios: Horario[] = [];

// modelo de Horario
export interface Horario {
  id: number;
  idTrabajador: number;
  idEmpresa: number;
  tipoJornada: string;
  dias: number;
  diasSemana: string;
  hora_entrada: Date;
  hora_salida: Date;
}

// Funciones para manejar los horarios

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
