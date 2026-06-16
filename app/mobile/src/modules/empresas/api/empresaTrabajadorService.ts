import { Empresa } from "../../../modules/empresas/types/empresa";
import { Horario } from "../../../modules/horarios/types/horario";
import { Trabajador } from "../../../modules/trabajadores/types/trabajador";
import { mockDb } from "../../../services/api/mockDb";
/**
 * Consulta y recupera el listado de empresas asociadas al perfil de un empleado específico.
 */
export const obtenerEmpresasTrabajador = async (
  trabajadorId: number,
): Promise<Empresa[]> => mockDb.getEmpresasTrabajador(trabajadorId);

/**
 * Agrega de forma persistente una empresa al expediente o perfil de un trabajador.
 * Establece un vínculo asociativo mutuo dentro del sistema de almacenamiento simulado.
 */
export const agregarEmpresaATrabajador = async (
  trabajadorId: number,
  empresaId: number,
): Promise<void> => mockDb.addEmpresaTrabajador(trabajadorId, empresaId);

/** Función de respaldo preparada para futuras integraciones de desvinculación empresarial. */
export const eliminarEmpresaDeTrabajador = async (): Promise<void> => undefined;

/**
 * Obtiene el listado completo de empleados dados de alta dentro de una empresa concreta.
 * Realiza una búsqueda global filtrando de forma matemática los identificadores incluidos.
 */
export const obtenerTrabajadoresPorEmpresa = async (
  empresaId: number,
): Promise<Trabajador[]> => {
  const trabajadores = await mockDb.getTrabajadores();
  return trabajadores.filter((trabajador) =>
    trabajador.empresas?.includes(empresaId),
  );
};

/**
 * Consulta y extrae todos los cuadrantes de horarios semanales asociados a una empresa particular.
 * Filtra los resultados mapeando el identificador del centro de trabajo especificado.
 */
export const obtenerHorariosPorEmpresa = async (
  empresaId: number,
): Promise<Horario[]> => {
  const horarios = await mockDb.getHorarios();
  return horarios.filter((horario) => horario.idEmpresa === empresaId);
};

/**
 * Vincula de forma directa a un empleado dentro del censo de una organización.
 * Utiliza de forma interna el mismo método cruzado de asociación mutua del sistema.
 */
export const agregarTrabajadorAEmpresa = async (
  empresaId: number,
  trabajadorId: number,
): Promise<void> => mockDb.addEmpresaTrabajador(trabajadorId, empresaId);
