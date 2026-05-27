import { Fichaje } from "../models/fichajes";

export const fichajes: Fichaje[] = [
  {
    id: 1,
    idTrabajador: 1, // Verifica si tus funciones leen 'idTrabajador' o 'id'
    idEmpresa: 1,
    tipo: "entrada",
    fecha: Date.now(),
    fecha_hora: new Date(Date.now() - 4 * 60 * 60 * 1000), // Hace 4 horas
  },
  {
    id: 2,
    idTrabajador: 1,
    idEmpresa: 1,
    tipo: "salida",
    fecha: Date.now(),
    fecha_hora: new Date(), // Ahora
  },
];
