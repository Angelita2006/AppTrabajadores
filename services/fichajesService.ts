import { Fichaje } from "../models/fichajes";
import api from "./api";

// Función para crear un fichaje nuevo
export const agregarFichaje = async (
  idTrabajador: number,
  idEmpresa: number,
  tipo: string,
): Promise<Fichaje> => {
  try {
    const res = await api.post(`/fichaje`, {
      idTrabajador,
      idEmpresa,
      tipo: "entrada",
    });
    return res.data;
  } catch (error) {
    if (error instanceof Error)
      console.error("Error al crear el nuevo fichaje: " + error.message);
    else console.error("Error desconocido.");
    throw error;
  }
};

// Función para obtener el fichaje de un trabajador en una empresa
export const getFichajesTrabajadorEmpresa = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Fichaje[]> => {
  try {
    const res = await api.get(
      `/fichajes?/trabajador/${idTrabajador}/empresa/${idEmpresa}`,
    );
    return res.data;
  } catch (error) {
    console.error("Error al obtener el fichaje:", error);
    throw error;
  }
};

// Función para obtener todos los fichajes
export const obtenerFichajes = async (): Promise<Fichaje[]> => {
  const res = await api.get("/fichajes");
  return res.data;
};

// Función para actualizar la información de un fichaje
export const updateFichaje = async (idFichaje: number): Promise<Fichaje> => {
  try {
    const res = await api.put(`/fichajes/${idFichaje}`, {});
    return res.data;
  } catch (error) {
    console.error("Error al actualizar el fichaje:", error);
    throw error;
  }
};
