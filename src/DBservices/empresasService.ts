import { Empresa } from "../models/empresas";
import api from "./api";

// crear una nueva empresa
export const crearEmpresa = async (
  nombre: string,
  cif: string,
  direccion: string,
  codigo_postal: string,
  poblacion: string,
  provincia: string,
): Promise<Empresa> => {
  try {
    const response = await api.post("/empresa", {
      nombre,
      cif,
      direccion,
      codigo_postal,
      poblacion,
      provincia,
    });
    return response.data;
  } catch (error) {
    console.error("Error creando empresa:", error);
    throw error;
  }
};

// editar una empresa existente
export const editarEmpresa = async (
  idEmpresa: number,
  nombre: string,
  cif: string,
  direccion: string,
  codigo_postal: string,
  poblacion: string,
  provincia: string,
): Promise<Empresa> => {
  try {
    const response = await api.put(`/empresa/${idEmpresa}`, {
      nombre,
      cif,
      direccion,
      codigo_postal,
      poblacion,
      provincia,
    });
    return response.data;
  } catch (error) {
    console.error("Error editando empresa:", error);
    throw error;
  }
};

// eliminar una empresa
export const eliminarEmpresa = async (idEmpresa: number): Promise<void> => {
  try {
    await api.delete(`/empresa/${idEmpresa}`);
  } catch (error) {
    console.error("Error eliminando empresa:", error);
    throw error;
  }
};

// obtener todas las empresas
export const obtenerEmpresas = async (): Promise<Empresa[]> => {
  try {
    const response = await api.get("/empresas");
    return response.data;
  } catch (error) {
    console.error("Error obteniendo empresas:", error);
    throw error;
  }
};

// obtener una empresa por su ID
export const obtenerEmpresa = async (idEmpresa: number): Promise<Empresa> => {
  try {
    const response = await api.get(`/empresa/${idEmpresa}`);
    return response.data;
  } catch (error) {
    console.error("Error obteniendo empresa:", error);
    throw error;
  }
};

// obtener trabajadores de una empresa
export const obtenerTrabajadoresEmpresa = async (
  idEmpresa: number,
): Promise<any[]> => {
  try {
    const response = await api.get(`/empresa/${idEmpresa}/trabajadores`);
    return response.data;
  } catch (error) {
    console.error("Error obteniendo trabajadores de empresa:", error);
    throw error;
  }
};
