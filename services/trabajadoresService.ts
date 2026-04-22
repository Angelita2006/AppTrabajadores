import { Trabajador } from "../models/trabajadores";
import api from "./api";

// Función para registrar un nuevo trabajador
export const crearTrabajador = async (
  dni: string,
  nombre: string,
  apellidos: string,
  codigo_postal: string,
  direccion: string,
  poblacion: string,
  provincia: string,
  cuenta_bancaria: string,
  puesto: string,
  email: string,
  password: string,
): Promise<Trabajador> => {
  try {
    const res = await api.post(`/trabajador`, {
      dni,
      nombre,
      apellidos,
      codigo_postal,
      direccion,
      poblacion,
      provincia,
      cuenta_bancaria,
      puesto,
      email,
      password,
    });
    return res.data;
  } catch (error) {
    console.error("Error al actualizar el trabajador:", error);
    throw error;
  }
};

// Función para actualizar la información de un trabajador
export const editarTrabajador = async (
  // id: number,
  dni: string,
  nombre: string,
  apellidos: string,
  codigo_postal: string,
  direccion: string,
  poblacion: string,
  provincia: string,
  cuenta_bancaria: string,
  puesto: string,
  email: string,
  password: string,
): Promise<Trabajador> => {
  try {
    const res = await api.put(`/trabajador/${dni}`, {
      dni,
      nombre,
      apellidos,
      codigo_postal,
      direccion,
      poblacion,
      provincia,
      cuenta_bancaria,
      puesto,
      email,
      password,
    });
    return res.data;
  } catch (error) {
    console.error("Error al actualizar el trabajador:", error);
    throw error;
  }
};

// Función para obtener un trabajador por su email y contraseña (para iniciar sesión)
export const getTrabajadorByEmailYPassword = async (
  email: string,
  password: string,
): Promise<Trabajador> => {
  try {
    const response = await api.get(`/trabajador/${email}/${password}`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener el trabajador:", error);
    throw error;
  }
};

// Función para obtener todos los trabajadores
export const obtenerTrabajadores = async (): Promise<Trabajador[]> => {
  const res = await api.get(`/trabajadores`);
  return res.data;
};

export const obtenerEmpresasTrabajador = async (idTrabajador: number) => {
  const res = await api.get(`/trabajador/${idTrabajador}/empresas`);
  return res.data;
};

export const agregarEmpresaATrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
) => {
  const res = await api.post(
    `trabajador/${idTrabajador}/empresas/${idEmpresa}`,
  );
  return res.data;
};
