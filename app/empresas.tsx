import api from "../services/api";
import { getEmpresas } from "../services/empresasService";
import { getTrabajadorById } from "./trabajadores";

// modelo de Empresa
export interface Empresa {
  id: number;
  nombre: string;
  cif: string;
  direccion: string;
  codigo_postal: string;
  poblacion: string;
  provincia: string;
  trabajadores?: number[];
}

// Funciones para manejar las empresas

// agrega una empresa a un trabajador y viceversa
export const agregarEmpresa = async (
  trabajadorId: number,
  empresa: Empresa,
): Promise<Empresa> => {
  // Logic should ideally call a service and update the state/DB
  const trabajador = await getTrabajadorById(trabajadorId);
  if (!trabajador || typeof trabajador.id !== "number") {
    throw new Error("Trabajador no encontrado");
  }
  // Implementation placeholder for modularity
  return empresa;
};

// crea una nueva empresa
export const crearEmpresa = (
  nombre: string,
  cif: string,
  direccion: string,
  codigo_postal: string,
  poblacion: string,
  provincia: string,
): Empresa => ({
  id: Math.random(), // Use a proper UUID or DB ID
  nombre,
  cif,
  direccion,
  codigo_postal,
  poblacion,
  provincia,
});

// obtiene una empresa por su id
export const getEmpresa = async (id: number): Promise<Empresa | null> => {
  try {
    const response = await api.get(`/empresas/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching empresa:", error);
    return null;
  }
};

export const obtenerEmpresas = async (): Promise<Empresa[]> => {
  return await getEmpresas();
};
