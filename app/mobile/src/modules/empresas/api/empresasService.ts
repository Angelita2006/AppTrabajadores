import { Empresa } from "../../../modules/empresas/types/empresa";
import { Trabajador } from "../../../modules/trabajadores/types/trabajador";
import { mockDb } from "../../../services/api/mockDb";
/**
 * Crea una nueva estructura de datos de empresa en memoria.
 * Genera un identificador único basado en la marca de tiempo actual del sistema (timestamp)
 * e inicializa la lista de trabajadores asociados como un arreglo vacío.
 */
export const crearEmpresa = async (
  nombre: string,
  cif: string,
  direccion: string,
  codigo_postal: string,
  poblacion: string,
  provincia: string,
): Promise<Empresa> => ({
  id: Date.now(), // Utiliza la marca de tiempo numérica actual como identificador único
  nombre,
  cif,
  direccion,
  codigo_postal,
  poblacion,
  provincia,
  trabajadores: [], // Inicializa la plantilla a cero
});

/**
 * Función preparada para modificar los datos fiscales de una organización.
 * Actualmente lanza un error controlado ya que la persistencia de edición no está activa en la simulación.
 */
export const editarEmpresa = async (): Promise<Empresa> => {
  throw new Error("editarEmpresa no implementado en mock");
};

/** Función de respaldo preparada para futuras integraciones de borrado de corporaciones. */
export const eliminarEmpresa = async (): Promise<void> => undefined;

/** Obtiene la lista completa de todas las empresas dadas de alta en la plataforma de simulación. */
export const obtenerEmpresas = async (): Promise<Empresa[]> =>
  mockDb.getEmpresas();

/**
 * Recupera la información de una empresa específica mediante su ID único de registro.
 * Lanza un error explícito si el identificador proporcionado no coincide con ninguna entidad.
 */
export const obtenerEmpresa = async (idEmpresa: number): Promise<Empresa> => {
  const empresa = await mockDb.getEmpresa(idEmpresa);
  if (!empresa) throw new Error("Empresa no encontrada");
  return empresa;
};

/**
 * Consulta y extrae la nómina completa de empleados vinculados a un centro de trabajo.
 * Realiza una búsqueda inversa en el directorio de personal comprobando las inclusiones de ID de empresa.
 */
export const obtenerTrabajadoresEmpresa = async (
  idEmpresa: number,
): Promise<Trabajador[]> => {
  const trabajadores = await mockDb.getTrabajadores();
  return trabajadores.filter((trabajador) =>
    trabajador.empresas?.includes(idEmpresa),
  );
};
