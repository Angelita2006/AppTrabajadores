import { empresas } from "../../mock/empresasMock";
import { horarios } from "../../mock/horariosMock";
import { trabajadores } from "../../mock/trabajadoresMock";
import { Empresa } from "../../models/empresas";
import { Horario } from "../../models/horarios";
import { Trabajador } from "../../models/trabajadores";
import { obtenerEmpresas } from "../empresasService";
import { getTrabajadorById } from "../trabajadoresService";

export const obtenerEmpresasTrabajador = async (
  trabajadorId: number,
): Promise<Empresa[]> => {
  const trabajador = trabajadores.find((t) => t.id === trabajadorId);
  if (!trabajador) return [];
  return (await obtenerEmpresas()).filter((e: { id: number }) =>
    trabajador.empresas?.includes(e.id),
  );
};

export const agregarEmpresaATrabajador = async (
  trabajadorId: number,
  empresaId: number,
): Promise<Empresa> => {
  const trabajador = await getTrabajadorById(trabajadorId);
  if (!trabajador || typeof trabajador.id !== "number") {
    throw new Error("Trabajador no encontrado");
  }

  let empresaExistente = empresas.find((e) => e.id === empresaId);
  if (!empresaExistente) {
    throw new Error("Empresa no encontrada");
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

// obtiene los trabajadores que pertenecen a una empresa
export const obtenerTrabajadoresPorEmpresa = async (
  empresaId: number,
): Promise<Trabajador[]> => {
  return trabajadores.filter((t) => (t.empresas ?? []).includes(empresaId));
};

// obtiene los horarios asociados a una empresa
export const obtenerHorariosPorEmpresa = async (
  empresaId: number,
): Promise<Horario[]> => {
  return horarios.filter((h) => h.idEmpresa === empresaId);
};
