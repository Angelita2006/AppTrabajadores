import { Fichaje } from "../../src/modules/fichajes/types/fichaje";

let ayeralas10 = new Date();
ayeralas10.setDate(ayeralas10.getDate() - 1);
ayeralas10.setHours(10, 0, 0, 0);
let ayeralas14 = new Date();
ayeralas14.setDate(ayeralas14.getDate() - 1);
ayeralas14.setHours(14, 0, 0, 0);
let ayeralas1630 = new Date();
ayeralas1630.setDate(ayeralas1630.getDate() - 1);
ayeralas1630.setHours(16, 30, 0, 0);
let ayeralas2030 = new Date();
ayeralas2030.setDate(ayeralas2030.getDate() - 1);
ayeralas2030.setHours(20, 30, 0, 0);
let hoyalas10 = new Date();
hoyalas10.setHours(10, 0, 0, 0);

export const fichajes: Fichaje[] = [
  {
    id: 1,
    idTrabajador: 1,
    idEmpresa: 1,
    tipo: "entrada",
    fecha: ayeralas10.getTime(),
    fecha_hora: ayeralas10,
  },
  {
    id: 2,
    idTrabajador: 1,
    idEmpresa: 1,
    tipo: "salida",
    fecha: ayeralas14.getTime(),
    fecha_hora: ayeralas14,
  },
  {
    id: 1,
    idTrabajador: 1,
    idEmpresa: 1,
    tipo: "entrada",
    fecha: ayeralas1630.getTime(),
    fecha_hora: ayeralas1630,
  },
  {
    id: 2,
    idTrabajador: 1,
    idEmpresa: 1,
    tipo: "salida",
    fecha: ayeralas2030.getTime(),
    fecha_hora: ayeralas2030,
  },
  {
    id: 3,
    idTrabajador: 1,
    idEmpresa: 1,
    tipo: "entrada",
    fecha: hoyalas10.getTime(),
    fecha_hora: hoyalas10,
  },

  {
    id: 4,
    idTrabajador: 2,
    idEmpresa: 1,
    tipo: "entrada",
    fecha: ayeralas10.getTime(),
    fecha_hora: ayeralas10,
  },
  {
    id: 5,
    idTrabajador: 2,
    idEmpresa: 1,
    tipo: "salida",
    fecha: ayeralas14.getTime(),
    fecha_hora: ayeralas14,
  },
  {
    id: 6,
    idTrabajador: 2,
    idEmpresa: 1,
    tipo: "entrada",
    fecha: hoyalas10.getTime(),
    fecha_hora: hoyalas10,
  },
];
