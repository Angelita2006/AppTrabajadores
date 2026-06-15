import { Empresa } from "../../../modules/empresas/types/empresa";
import { Horario } from "../../../modules/horarios/types/horario";
import { Trabajador } from "../../../modules/trabajadores/types/trabajador";
import { mockDb } from "../../../services/api/mockDb";

export const obtenerEmpresasTrabajador = async (
  trabajadorId: number,
): Promise<Empresa[]> => mockDb.getEmpresasTrabajador(trabajadorId);

export const agregarEmpresaATrabajador = async (
  trabajadorId: number,
  empresaId: number,
): Promise<void> => mockDb.addEmpresaTrabajador(trabajadorId, empresaId);

export const eliminarEmpresaDeTrabajador = async (): Promise<void> => undefined;

export const obtenerTrabajadoresPorEmpresa = async (
  empresaId: number,
): Promise<Trabajador[]> => {
  const trabajadores = await mockDb.getTrabajadores();
  return trabajadores.filter((trabajador) =>
    trabajador.empresas?.includes(empresaId),
  );
};

export const obtenerHorariosPorEmpresa = async (
  empresaId: number,
): Promise<Horario[]> => {
  const horarios = await mockDb.getHorarios();
  return horarios.filter((horario) => horario.idEmpresa === empresaId);
};

export const agregarTrabajadorAEmpresa = async (
  empresaId: number,
  trabajadorId: number,
): Promise<void> => mockDb.addEmpresaTrabajador(trabajadorId, empresaId);
