import { Fichaje } from "../models/fichajes";

export const fichajes: Fichaje[] = [
  {
    id: 1,
    idTrabajador: 1,
    idEmpresa: 1,
    tipo: "entrada",
    fecha: parseInt(new Date().toISOString()),
    fecha_hora: new Date(),
  },
  {
    id: 2,
    idTrabajador: 1,
    idEmpresa: 1,
    tipo: "salida",
    fecha: parseInt(new Date().toISOString()),
    fecha_hora: new Date(),
  },
];
