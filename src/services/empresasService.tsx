import { empresas } from "../mock/empresasMock";
import { Empresa } from "../models/empresas";
// import { getTrabajadorById } from "./trabajadoresService";

let idsEmpresas = Math.max(...empresas.map((e) => e.id), 0);

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

// edita una empresa existente
export const editarEmpresa = (
  id: number,
  nombre: string,
  cif: string,
  direccion: string,
  codigo_postal: string,
  poblacion: string,
  provincia: string,
): Empresa => {
  const empresa = empresas.find((e) => e.id === id);
  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }
  empresa.nombre = nombre;
  empresa.cif = cif;
  empresa.direccion = direccion;
  empresa.codigo_postal = codigo_postal;
  empresa.poblacion = poblacion;
  empresa.provincia = provincia;
  return empresa;
};

// agrega una empresa a un trabajador y viceversa
// export const agregarEmpresaATrabajador = async (
//   trabajadorId: number,
//   empresaId: number,
// ): Promise<Empresa> => {
//   const { getTrabajadorById } = await require("./trabajadoresService");
//   const trabajador = await getTrabajadorById(trabajadorId);
//   if (!trabajador || typeof trabajador.id !== "number") {
//     throw new Error("Trabajador no encontrado");
//   }

//   let empresaExistente = empresas.find((e) => e.id === empresaId);
//   if (!empresaExistente) {
//     throw new Error("Empresa no encontrada");
//   }

//   if (!trabajador.empresas?.includes(empresaExistente.id)) {
//     trabajador.empresas = [...(trabajador.empresas ?? []), empresaExistente.id];
//   }

//   if (!empresaExistente.trabajadores?.includes(trabajador.id)) {
//     empresaExistente.trabajadores = [
//       ...(empresaExistente.trabajadores ?? []),
//       trabajador.id,
//     ];
//   }

//   return empresaExistente;
// };

// obtener todas las empresas
export const obtenerEmpresas = async (): Promise<Empresa[]> => {
  return await Promise.resolve(empresas);
};

// obtiene una empresa por su id
export const getEmpresaById = async (id: number): Promise<Empresa> => {
  try {
    const empresa = empresas.find((e) => e.id === id);
    return empresa || ("Empresa no encontrada" as unknown as Empresa);
  } catch (error) {
    console.error("Error fetching empresa:", error);
    return "Empresa no encontrada" as unknown as Empresa;
  }
};
