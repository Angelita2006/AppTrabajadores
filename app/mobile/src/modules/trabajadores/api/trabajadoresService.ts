import { Empresa } from "@/modules/empresas/types/empresa";
import { Fichaje } from "@/modules/fichajes/types/fichaje";
import { Horario } from "@/modules/horarios/types/horario";
import { Estado, Trabajador } from "@/modules/trabajadores/types/trabajador";
import { mockDb } from "@/services/api/mockDb";

const normalizeEstado = (estado: Estado | string): Estado =>
  typeof estado === "number"
    ? estado
    : ((Estado[estado as keyof typeof Estado] as unknown as Estado) ??
      Estado.Activo);

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

export const eliminarTrabajador = async (): Promise<void> => undefined;

export const obtenerTrabajadores = async (): Promise<Trabajador[]> =>
  mockDb.getTrabajadores();

export const obtenerTrabajador = async (
  idTrabajador: number,
): Promise<Trabajador> => {
  const trabajador = await mockDb.getTrabajador(idTrabajador);
  if (!trabajador) throw new Error("Trabajador no encontrado");
  return trabajador;
};

export const getTrabajadorByEmailYPassword = async (
  email: string,
  password: string,
): Promise<Trabajador> => {
  const trabajador = await mockDb.login(email, password);
  if (!trabajador) throw new Error("Credenciales incorrectas");
  return trabajador;
};

export const obtenerTrabajadorPorEmailYPassword =
  getTrabajadorByEmailYPassword;

export const obtenerEmpresasTrabajador = async (
  idTrabajador: number,
): Promise<Empresa[]> => mockDb.getEmpresasTrabajador(idTrabajador);

export const obtenerFichajesTorabajador = async (
  idTrabajador: number,
): Promise<Fichaje[]> => {
  const fichajes = await mockDb.getFichajes();
  return fichajes.filter((fichaje) => fichaje.idTrabajador === idTrabajador);
};

export const obtenerHorariosTrabajador = async (
  idTrabajador: number,
): Promise<Horario[]> => {
  const horarios = await mockDb.getHorarios();
  return horarios.filter((horario) => horario.idTrabajador === idTrabajador);
};

export const agregarEmpresaATrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<void> => mockDb.addEmpresaTrabajador(idTrabajador, idEmpresa);

export const eliminarEmpresaDeTrabajador = async (): Promise<void> => undefined;

export const agregarHorarioATrabajador = async (): Promise<void> => undefined;

export const agregarFichajeATrabajador = async (): Promise<void> => undefined;

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

export const getUltimoFichajeTrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Fichaje | null> => {
  const fichajes = await mockDb.getFichajesTrabajadorEmpresa(
    idTrabajador,
    idEmpresa,
  );
  return fichajes.at(-1) ?? null;
};

export const obtenerFichajesEmpresaTrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Fichaje[]> =>
  mockDb.getFichajesTrabajadorEmpresa(idTrabajador, idEmpresa);
