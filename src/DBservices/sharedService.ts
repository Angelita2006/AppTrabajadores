import { Empresa } from "../models/empresas";
import { Horario } from "../models/horarios";
import { Trabajador } from "../models/trabajadores";
import api from "./api";

// obtener empresas de un trabajador
export const obtenerEmpresasTrabajador = async (
  trabajadorId: number,
): Promise<Empresa[]> => {
  try {
    const response = await api.get(`/trabajador/${trabajadorId}/empresas`);
    return response.data;
  } catch (error) {
    console.error("Error obteniendo empresas del trabajador:", error);
    throw error;
  }
};

// agregar empresa a un trabajador
export const agregarEmpresaATrabajador = async (
  trabajadorId: number,
  empresaId: number,
): Promise<void> => {
  try {
    await api.put(`/trabajador/${trabajadorId}/empresas/${empresaId}`);
  } catch (error) {
    console.error("Error agregando empresa al trabajador:", error);
    throw error;
  }
};

// eliminar empresa de un trabajador
export const eliminarEmpresaDeTrabajador = async (
  trabajadorId: number,
  empresaId: number,
): Promise<void> => {
  try {
    await api.delete(`/trabajador/${trabajadorId}/empresas/${empresaId}`);
  } catch (error) {
    console.error("Error eliminando empresa del trabajador:", error);
    throw error;
  }
};

// obtener trabajadores de una empresa
export const obtenerTrabajadoresPorEmpresa = async (
  empresaId: number,
): Promise<Trabajador[]> => {
  try {
    const response = await api.get(`/empresa/${empresaId}/trabajadores`);
    return response.data;
  } catch (error) {
    console.error("Error obteniendo trabajadores de la empresa:", error);
    throw error;
  }
};

// obtener horarios de una empresa
export const obtenerHorariosPorEmpresa = async (
  empresaId: number,
): Promise<Horario[]> => {
  try {
    const response = await api.get(`/empresa/${empresaId}/horarios`);
    return response.data;
  } catch (error) {
    console.error("Error obteniendo horarios de la empresa:", error);
    throw error;
  }
};

// agregar trabajador a una empresa
export const agregarTrabajadorAEmpresa = async (
  empresaId: number,
  trabajadorId: number,
): Promise<void> => {
  try {
    await api.put(`/empresa/${empresaId}/trabajadores/${trabajadorId}`);
  } catch (error) {
    console.error("Error agregando trabajador a la empresa:", error);
    throw error;
  }
};
