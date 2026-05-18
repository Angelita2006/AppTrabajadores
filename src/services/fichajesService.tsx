import { fichajes } from "../mock/fichajesMock";
import { Fichaje } from "../models/fichajes";

let idsFichajes = Math.max(...fichajes.map((f) => f.id), 0);

export const crearFichaje = (
  idTrabajador: number,
  idEmpresa: number,
  tipo: "entrada" | "salida" | "descanso" | "horas_extra",
): Fichaje => {
  const fichaje = {
    id: idsFichajes++,
    idTrabajador,
    idEmpresa,
    tipo,
    fecha: new Date().toISOString(),
    fecha_hora: new Date(),
  };
  fichajes.push(fichaje);

  return fichaje;
};

// obtiene los fichajes de un trabajador en una empresa específica
export const obtenerFichajesEmpresaTrabajador = (
  idTrabajador: number,
  idEmpresa: number,
): Fichaje[] => {
  return fichajes.filter(
    (f) => f.idTrabajador === idTrabajador && f.idEmpresa === idEmpresa,
  );
};
