import api from "../services/api";
import { getEmpresas } from "../services/empresasService";
import { getTrabajadorById } from "./trabajadores";

let idsEmpresas = 0;

// datos de ejemplo de empresas
let empresas: Empresa[] = [
  {
    id: idsEmpresas++,
    nombre: "Bullastec",
    cif: "B73975112",
    direccion: "C\ Calasparra, 14",
    codigo_postal: "30180",
    poblacion: "Bullas",
    provincia: "Murcia",
  },
  {
    id: idsEmpresas++,
    nombre: "Mubutel",
    cif: "B01626076",
    direccion: "Av. Luis de los Reyes, 26 1º",
    codigo_postal: "30180",
    poblacion: "Bullas",
    provincia: "Murcia",
  },
  {
    id: idsEmpresas++,
    nombre: "Butemur",
    cif: "B75866731",
    direccion: "Av. Luis de los Reyes, 26 1º",
    codigo_postal: "30180",
    poblacion: "Bullas",
    provincia: "Murcia",
  },
];

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
  const trabajador = await getTrabajadorById(trabajadorId);
  if (!trabajador || typeof trabajador.id !== "number") {
    throw new Error("Trabajador no encontrado");
  }

  let empresaExistente = empresas.find((e) => e.id === empresa.id);
  if (!empresaExistente) {
    empresas.push(empresa);
    empresaExistente = empresa;
  }

  if (!trabajador.empresas?.includes(empresaExistente.id)) {
    trabajador.empresas = [...(trabajador.empresas ?? []), empresaExistente.id];
  }

  if (!empresaExistente.trabajadores?.includes(trabajador.id)) {
    empresaExistente.trabajadores = [
      ...(empresaExistente.trabajadores ?? []),
      trabajador.id,
    ];
  }

  return empresaExistente;
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
  id: idsEmpresas++,
  nombre,
  cif,
  direccion,
  codigo_postal,
  poblacion,
  provincia,
});

// obtiene una empresa por su id
export const getEmpresa = async (id: number): Promise<Empresa | null> => {
  const empresaLocal = empresas.find((e) => e.id === id);
  if (empresaLocal) return empresaLocal;

  try {
    const response = await api.get(`/empresas/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching empresa:", error);
    return null;
  }
};

export const obtenerEmpresas = async (): Promise<Empresa[]> => {
  empresas = await Promise.resolve(getEmpresas());
  return empresas;
};
