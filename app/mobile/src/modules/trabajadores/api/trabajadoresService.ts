import { Empresa } from "../../../modules/empresas/types/empresa";
import { Fichaje } from "../../../modules/fichajes/types/fichaje";
import { Horario } from "../../../modules/horarios/types/horario";
import {
  Estado,
  Trabajador,
} from "../../../modules/trabajadores/types/trabajador";
import { mockDb } from "../../../services/api/mockDb";
/**
 * Normaliza el estado del trabajador asegurando que devuelva un valor numérico del enumerado.
 * Si recibe una cadena de texto, busca su equivalencia o asigna 'Activo' por defecto.
 */
const normalizeEstado = (estado: Estado | string): Estado =>
  typeof estado === "number"
    ? estado
    : ((Estado[estado as keyof typeof Estado] as unknown as Estado) ??
      Estado.Activo);

/**
 * Registra un nuevo trabajador en la base de datos simulada.
 * Le asigna por defecto el rol de usuario estándar y lo vincula a la empresa con ID 1.
 */
export const crearTrabajador = async (
  nombre: string,
  apellidos: string,
  dni: string,
  puesto: string,
  direccion: string,
  codigo_postal: string,
  poblacion: string,
  provincia: string,
  estado: Estado,
  cuenta_cotizacion: string,
  email: string,
  password: string,
): Promise<Trabajador> =>
  mockDb.createTrabajador({
    nombre,
    apellidos,
    dni,
    puesto,
    direccion,
    codigo_postal,
    poblacion,
    provincia,
    estado,
    cuenta_cotizacion,
    email,
    password,
    role: "user",
    empresas: [1],
  });

/**
 * Modifica los datos de un trabajador existente localizándolo mediante su ID único.
 * Lanza un error si el identificador no coincide con ningún registro.
 */
export const editarTrabajador = async (
  idTrabajador: number,
  nombre: string,
  apellidos: string,
  dni: string,
  puesto: string,
  direccion: string,
  codigo_postal: string,
  poblacion: string,
  provincia: string,
  cuenta_cotizacion: string,
  email: string,
  password: string,
): Promise<Trabajador> => {
  const trabajador = await mockDb.updateTrabajador(idTrabajador, {
    nombre,
    apellidos,
    dni,
    puesto,
    direccion,
    codigo_postal,
    poblacion,
    provincia,
    cuenta_cotizacion,
    email,
    password,
  });

  if (!trabajador) throw new Error("Trabajador no encontrado");
  return trabajador;
};

/**
 * Modifica el perfil de un empleado localizándolo mediante su número de DNI.
 * Realiza una búsqueda inicial previa en la lista global de trabajadores antes de actualizar.
 */
export const editarTrabajadorPorDNI = async (
  dni: string,
  nombre: string,
  apellidos: string,
  direccion: string,
  codigo_postal: string,
  poblacion: string,
  provincia: string,
  cuenta_cotizacion: string,
  puesto: string,
  email: string,
  password: string,
): Promise<Trabajador> => {
  const trabajadores = await mockDb.getTrabajadores();
  const actual = trabajadores.find((trabajador) => trabajador.dni === dni);
  if (!actual) throw new Error("Trabajador no encontrado");

  const actualizado = await mockDb.updateTrabajador(actual.id, {
    nombre,
    apellidos,
    direccion,
    codigo_postal,
    poblacion,
    provincia,
    cuenta_cotizacion,
    puesto,
    email,
    password,
  });
  if (!actualizado) throw new Error("Trabajador no encontrado");
  return actualizado;
};

/** Función preparada para futuras integraciones de borrado de registros. */
export const eliminarTrabajador = async (): Promise<void> => undefined;

/** Obtiene la lista completa de todos los trabajadores del sistema. */
export const obtenerTrabajadores = async (): Promise<Trabajador[]> =>
  mockDb.getTrabajadores();

/** Recupera la información de un trabajador específico por su ID único. */
export const obtenerTrabajador = async (
  idTrabajador: number,
): Promise<Trabajador> => {
  const trabajador = await mockDb.getTrabajador(idTrabajador);
  if (!trabajador) throw new Error("Trabajador no encontrado");
  return trabajador;
};

/**
 * Realiza la comprobación de credenciales para el inicio de sesión.
 * Lanza un error explícito si los datos de acceso no son válidos.
 */
export const getTrabajadorByEmailYPassword = async (
  email: string,
  password: string,
): Promise<Trabajador> => {
  const trabajador = await mockDb.login(email, password);
  if (!trabajador) throw new Error("Credenciales incorrectas");
  return trabajador;
};

/** Alias secundario de la función de comprobación de inicio de sesión. */
export const obtenerTrabajadorPorEmailYPassword = getTrabajadorByEmailYPassword;

/** Consulta el listado de empresas asociadas al perfil de un trabajador. */
export const obtenerEmpresasTrabajador = async (
  idTrabajador: number,
): Promise<Empresa[]> => mockDb.getEmpresasTrabajador(idTrabajador);

/** Recupera el historial total de fichajes realizados por un empleado específico. */
export const obtenerFichajesTorabajador = async (
  idTrabajador: number,
): Promise<Fichaje[]> => {
  const fichajes = await mockDb.getFichajes();
  return fichajes.filter((fichaje) => fichaje.idTrabajador === idTrabajador);
};

/** Consulta los cuadrantes de horarios asignados a las jornadas de un empleado. */
export const obtenerHorariosTrabajador = async (
  idTrabajador: number,
): Promise<Horario[]> => {
  const horarios = await mockDb.getHorarios();
  return horarios.filter((horario) => horario.idTrabajador === idTrabajador);
};

/** Establece un vínculo de asociación mutua en memoria entre un empleado y una empresa. */
export const agregarEmpresaATrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<void> => mockDb.addEmpresaTrabajador(idTrabajador, idEmpresa);

/** Función preparada para futuras integraciones de desvinculación empresarial. */
export const eliminarEmpresaDeTrabajador = async (): Promise<void> => undefined;

/** Función preparada para futuras integraciones de asignación de horarios. */
export const agregarHorarioATrabajador = async (): Promise<void> => undefined;

/** Función preparada para futuras integraciones de inserción de fichajes manuales. */
export const agregarFichajeATrabajador = async (): Promise<void> => undefined;

/**
 * Modifica exclusivamente el estado operativo (Ej: Activo, Vacaciones, Baja) de un empleado usando su DNI.
 * Aplica una normalización previa del dato recibido antes de persistirlo en el sistema.
 */
export const editarEstadoTrabajador = async (
  dni: string,
  estado: Estado,
): Promise<Trabajador> => {
  const trabajadores = await mockDb.getTrabajadores();
  const actual = trabajadores.find((trabajador) => trabajador.dni === dni);
  if (!actual) throw new Error("Trabajador no encontrado");
  const actualizado = await mockDb.updateTrabajador(actual.id, {
    estado: normalizeEstado(estado),
  });
  if (!actualizado) throw new Error("Trabajador no encontrado");
  return actualizado;
};

/**
 * Obtiene el último evento de fichaje registrado por el empleado en una empresa determinada.
 * Se utiliza habitualmente para comprobar si el usuario se encuentra actualmente dentro o fuera de su jornada.
 */
export const getUltimoFichajeTrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Fichaje | null> => {
  const fichajes = await mockDb.getFichajesTrabajadorEmpresa(
    idTrabajador,
    idEmpresa,
  );
  return fichajes.at(-1) ?? null; // Retorna el último elemento del arreglo ordenado
};

/** Obtiene el historial completo de fichajes de un empleado filtrado por una empresa específica. */
export const obtenerFichajesEmpresaTrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Fichaje[]> =>
  mockDb.getFichajesTrabajadorEmpresa(idTrabajador, idEmpresa);
