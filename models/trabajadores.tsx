import api from "../services/api";
import { Empresa, obtenerEmpresas } from "./empresas";

let idsTrabajadores = 0;

// datos de ejemplo de trabajadores
const trabajadores: Trabajador[] = [
  {
    id: idsTrabajadores++,
    dni: "12345678A",
    nombre: "Manolo",
    apellidos: "Pérez",
    direccion: "Calle Falsa 123",
    codigo_postal: "28080",
    poblacion: "Madrid",
    provincia: "Madrid",
    cuenta_cotizacion: "ES12345678901234567890",
    puesto: "Desarrollador",
    email: "manolo@example.com",
    password: "password123",
  }
];

// modelo de Trabajador
export interface Trabajador {
  id: number;
  empresas?: number[];
  fichajes?: number[];
  horarios?: number[];
  dni: string;
  nombre: string;
  apellidos: string;
  direccion: string;
  codigo_postal: string;
  poblacion: string;
  provincia: string;
  cuenta_cotizacion: string;
  puesto: string;
  email: string;
  password: string;
}

// Funciones para manejar los trabajadores

// crea un nuevo trabajador
export const crearTrabajador = (
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
): Trabajador => ({
  id: idsTrabajadores++,
  dni,
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
  empresas: [],
  horarios: [],
  fichajes: [],
});

// obtiene todos los trabajadores
export const obtenerTrabajadores = (): Trabajador[] => {
  return trabajadores;
};

// obtiene las empresas a las que pertenece un trabajador
export const obtenerEmpresasTrabajador = async (
  trabajadorId: number,
): Promise<Empresa[]> => {
  const trabajador = trabajadores.find((t) => t.id === trabajadorId);
  if (!trabajador) return [];
  return (await obtenerEmpresas()).filter((e: { id: number }) =>
    trabajador.empresas?.includes(e.id),
  );
};

// obtiene un trabajador por su id
export const getTrabajadorById = async (
  id: number,
): Promise<Trabajador | null> => {
  const trabajadorLocal = trabajadores.find((t) => t.id === id);
  if (trabajadorLocal) return trabajadorLocal;

  try {
    const response = await api.get(`/trabajador?id=${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching trabajador:", error);
    return null;
  }
};

// obtiene un trabajador por su email y contraseña (para iniciar sesión)
export const getTrabajadorByEmailYContraseña = async (
  email: string,
  password: string,
): Promise<Trabajador> => {
  try {
    const response = await fetch(
      `/api/trabajador?email=${email}&password=${password}`,
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
  const trabajador = trabajadores.find((t) => t.email === email);
  if (trabajador) {
    trabajador.nombre = nombre;
    trabajador.dni = dni;
    trabajador.puesto = puesto;
    trabajador.password = password;
    return trabajador;
  }
  throw new Error("Trabajador no encontrado");
};
