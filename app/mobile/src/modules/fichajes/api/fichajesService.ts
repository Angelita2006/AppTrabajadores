import { Fichaje } from "../../../modules/fichajes/types/fichaje";
import { mockDb } from "../../../services/api/mockDb";

export const crearFichaje = async (
  idTrabajador: number,
  idEmpresa: number,
  tipo: Fichaje["tipo"],
): Promise<Fichaje> => mockDb.createFichaje(idTrabajador, idEmpresa, tipo);

export const editarFichaje = async (): Promise<Fichaje> => {
  throw new Error("editarFichaje no implementado en mock");
};

export const eliminarFichaje = async (): Promise<void> => undefined;

export const obtenerFichajes = async (): Promise<Fichaje[]> =>
  mockDb.getFichajes();

export const obtenerFichaje = async (idFichaje: number): Promise<Fichaje> => {
  const fichajes = await mockDb.getFichajes();
  const fichaje = fichajes.find((item) => item.id === idFichaje);
  if (!fichaje) throw new Error("Fichaje no encontrado");
  return fichaje;
};

export const obtenerFichajesTrabajadorEmpresa = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Fichaje[]> =>
  mockDb.getFichajesTrabajadorEmpresa(idTrabajador, idEmpresa);

export const obtenerFichajesEmpresaTrabajador =
  obtenerFichajesTrabajadorEmpresa;
