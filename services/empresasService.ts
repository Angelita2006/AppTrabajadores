import { Empresa } from "../models/empresas";
import { Trabajador } from "../models/trabajadores";
import api from "./api";

// Función para obtener el fichaje de un trabajador en una empresa
export const getTrabajadoresEmpresa = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Trabajador[]> => {
  try {
    const res = await api.get(`/empresas?/${idEmpresa}/trabajadores`);
    return res.data;
  } catch (error) {
    console.error("Error al obtener los trabajadores de la empresa:", error);
    throw error;
  }
};

// Función para actualizar la información de un fichaje
export const updateEmpresa = async (idEmpresa: number): Promise<Empresa> => {
  try {
    const res = await api.put(`/empresas/${idEmpresa}`, {});
    return res.data;
  } catch (error) {
    console.error("Error al actualizar la empresa:", error);
    throw error;
  }
};

// Función para obtener todos los fichajes
export const getEmpresas = async (): Promise<Empresa[]> => {
  const res = await api.get("/empresas");
  return res.data;
};
