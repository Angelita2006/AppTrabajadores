import { fichajes } from "../mock/fichajesMock";
import { trabajadores } from "../mock/trabajadoresMock";
import { Fichaje } from "../models/fichajes";

let idsFichajes = Math.max(...fichajes.map((f) => f.id), 0) + 1;

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
    fecha: Date.now(),
    fecha_hora: new Date(Date.now()),
  };
  fichajes.push(fichaje);

  try {
    const trabajador = trabajadores.find((t) => t.id === idTrabajador);
    if (trabajador) {
      trabajador.fichajes = [...(trabajador.fichajes ?? []), fichaje.id];
    }
  } catch (e) {
    console.error("No se pudo asociar el fichaje al trabajador:", e);
  }

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

export const getFichajeTrabajadorEmpresa = (
  idFichaje: number,
  idTrabajador: number,
  idEmpresa: number,
): Fichaje | null => {
  const fichajesTrabajadorEmpresa = obtenerFichajesEmpresaTrabajador(
    idTrabajador,
    idEmpresa,
  );

  if (fichajesTrabajadorEmpresa.length === 0) {
    return null;
  }
  const fichaje = fichajesTrabajadorEmpresa.find((f) => f.id === idFichaje);

  return fichaje || null;
};
