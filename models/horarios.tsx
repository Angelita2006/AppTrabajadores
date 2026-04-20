import { Trabajador, obtenerTrabajadores } from "./trabajadores";

let idsHorarios = 0;

const horarios: Horario[] = [];

// modelo de Horario
export interface Horario {
  id: number;
  idTrabajador: number;
  idEmpresa: number;
  tipoJornada: string;
  dias: number;
  diasSemana: string;
  hora_entrada: Date;
  hora_salida: Date;
}

// Funciones para manejar los horarios

// crea un nuevo horario
export const crearHorario = (
  idTrabajador: number,
  idEmpresa: number,
  tipoJornada: string,
  dias: number,
  diasSemana: string,
  hora_entrada: Date,
  hora_salida: Date,
): Horario => ({
  id: idsHorarios++,
  idTrabajador,
  idEmpresa,
  tipoJornada,
  dias,
  diasSemana,
  hora_entrada,
  hora_salida,
});

// obtiene todos los horarios
export const obtenerHorarios = (): Horario[] => {
  return horarios;
};

// obtiene el horario de un trabajador en una empresa específica
export const obtenerHorario = (
  idTrabajador: number,
  idEmpresa: number,
): Horario | undefined => {
  return horarios.find(
    (h) => h.idTrabajador === idTrabajador && h.idEmpresa === idEmpresa,
  );
};

// obtiene un trabajador por su email y contraseña (para iniciar sesión)
export const getTrabajadorByEmailYContraseña = async (
  email: string,
  contraseña: string,
): Promise<Trabajador> => {
  try {
    const response = await fetch(
      `/api/trabajador?email=${email}&contraseña=${contraseña}`,
    );
    const data = (await response).json();
    return data as unknown as Trabajador;
  } catch (error) {
    console.error("Error fetching trabajador:", error);
    return "Trabajador no encontrado" as unknown as Trabajador;
  }
};

// actualiza la información de un trabajador
export const updateTrabajador = (
  nombre: string,
  dni: string,
  puesto: string,
  email: string,
  password: string,
): Trabajador => {
  const trabajador = obtenerTrabajadores().find(
    (t: { email: string }) => t.email === email,
  );
  if (trabajador) {
    trabajador.nombre = nombre;
    trabajador.dni = dni;
    trabajador.puesto = puesto;
    trabajador.password = password;
    return trabajador;
  }
  throw new Error("Trabajador no encontrado");
};
