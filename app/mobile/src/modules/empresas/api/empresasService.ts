import { Empresa } from "@/modules/empresas/types/empresa";
import { Trabajador } from "@/modules/trabajadores/types/trabajador";
import { mockDb } from "@/services/api/mockDb";

export const crearEmpresa = async (
  nombre: string,
  cif: string,
  direccion: string,
  codigo_postal: string,
  poblacion: string,
  provincia: string,
): Promise<Empresa> => ({
  id: Date.now(),
  nombre,
  cif,
  direccion,
  codigo_postal,
  poblacion,
  provincia,
  trabajadores: [],
});

export const editarEmpresa = async (): Promise<Empresa> => {
  throw new Error("editarEmpresa no implementado en mock");
};

export const eliminarEmpresa = async (): Promise<void> => undefined;

export const obtenerEmpresas = async (): Promise<Empresa[]> =>
  mockDb.getEmpresas();

export const obtenerEmpresa = async (idEmpresa: number): Promise<Empresa> => {
  const empresa = await mockDb.getEmpresa(idEmpresa);
  if (!empresa) throw new Error("Empresa no encontrada");
  return empresa;
};

export const obtenerTrabajadoresEmpresa = async (
  idEmpresa: number,
): Promise<Trabajador[]> => {
  const trabajadores = await mockDb.getTrabajadores();
  return trabajadores.filter((trabajador) =>
    trabajador.empresas?.includes(idEmpresa),
  );
};
