import { Fichaje } from "../models/fichajes";
import api from "./api";

// crear un nuevo fichaje
export const crearFichaje = async (
  idTrabajador: number,
  idEmpresa: number,
  tipo: "entrada" | "salida" | "descanso" | "horas_extra",
): Promise<Fichaje> => {
  try {
    const response = await api.post("/fichaje", {
      idTrabajador,
      idEmpresa,
      tipo,
    });
    return response.data;
  } catch (error) {
    console.error("Error creando fichaje:", error);
    throw error;
  }
};

// editar un fichaje existente
export const editarFichaje = async (
  idFichaje: number,
  idTrabajador: number,
  idEmpresa: number,
  tipo: string,
  fecha_hora: string,
): Promise<Fichaje> => {
  try {
    const response = await api.put(`/fichaje/${idFichaje}`, {
      idTrabajador,
      idEmpresa,
      tipo,
      fecha_hora,
    });
    return response.data;
  } catch (error) {
    console.error("Error editando fichaje:", error);
    throw error;
  }
};

// eliminar un fichaje
export const eliminarFichaje = async (idFichaje: number): Promise<void> => {
  try {
    await api.delete(`/fichaje/${idFichaje}`);
  } catch (error) {
    console.error("Error eliminando fichaje:", error);
    throw error;
  }
};

// obtener todos los fichajes
export const obtenerFichajes = async (): Promise<Fichaje[]> => {
  try {
    const response = await api.get("/fichajes");
    return response.data;
  } catch (error) {
    console.error("Error obteniendo fichajes:", error);
    throw error;
  }
};

// obtener un fichaje por ID
export const obtenerFichaje = async (idFichaje: number): Promise<Fichaje> => {
  try {
    const response = await api.get(`/fichaje/${idFichaje}`);
    return response.data;
  } catch (error) {
    console.error("Error obteniendo fichaje:", error);
    throw error;
  }
};

// obtener fichajes de un trabajador en una empresa específica
export const obtenerFichajesTrabajadorEmpresa = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Fichaje[]> => {
  try {
    const response = await api.get(
      `/fichajes/trabajador/${idTrabajador}/empresa/${idEmpresa}`,
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error obteniendo fichajes del trabajador en la empresa:",
      error,
    );
    throw error;
  }
};

export const obtenerFichajesEmpresaTrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Fichaje[]> => {
  return obtenerFichajesTrabajadorEmpresa(idTrabajador, idEmpresa);
};
