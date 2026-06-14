import { Horario } from "@/modules/horarios/types/horario";

export const horarios: Horario[] = [
  {
    id: 1,
    idTrabajador: 1,
    idEmpresa: 1,
    tipoJornada: "completa",
    dias: 5,
    diasSemana: "LMXJV",
    hora_entrada1: new Date(new Date().setHours(10, 0, 0, 0)),
    hora_salida1: new Date(new Date().setHours(14, 0, 0, 0)),
    hora_entrada2: new Date(new Date().setHours(16, 30, 0, 0)),
    hora_salida2: new Date(new Date().setHours(20, 30, 0, 0)),
  },
  {
    id: 2,
    idTrabajador: 2,
    idEmpresa: 1,
    tipoJornada: "parcial",
    dias: 5,
    diasSemana: "LMXJV",
    hora_entrada1: new Date(new Date().setHours(10, 0, 0, 0)),
    hora_salida1: new Date(new Date().setHours(14, 0, 0, 0)),
  },
];
