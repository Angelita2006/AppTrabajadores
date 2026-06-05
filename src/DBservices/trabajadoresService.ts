import { Empresa } from "../models/empresas";
import { Fichaje } from "../models/fichajes";
import { Horario } from "../models/horarios";
import { Estado, Trabajador } from "../models/trabajadores";
import api from "./api";

const normalizeEstado = (estado: Estado | string): string =>
  typeof estado === "number" ? Estado[estado] : String(estado);

const normalizeTrabajador = (trabajador: any): Trabajador => {
  if (!trabajador) return trabajador;
  const normalized = {
    ...trabajador,
    estado:
      typeof trabajador.estado === "string"
        ? (Estado[
            trabajador.estado as keyof typeof Estado
          ] as unknown as Estado)
        : trabajador.estado,
  };
  return normalized;
};

// crear un nuevo trabajador
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
): Promise<Trabajador> => {
  try {
    const response = await api.post("/trabajador", {
      nombre,
      apellidos,
      dni,
      puesto,
      direccion,
      codigo_postal,
      poblacion,
      provincia,
      estado: normalizeEstado(estado),
      cuenta_cotizacion,
      email,
      password,
    });
    return normalizeTrabajador(response.data);
  } catch (error) {
    console.error("Error creando trabajador:", error);
    throw error;
  }
};

// editar un trabajador existente por ID
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
  try {
    const trabajadorActual = await obtenerTrabajador(idTrabajador);
    const estadoActual = normalizeEstado(
      trabajadorActual?.estado ?? Estado.Inactivo,
    );

    const response = await api.put(`/trabajador/${idTrabajador}`, {
      nombre,
      apellidos,
      dni,
      puesto,
      direccion,
      codigo_postal,
      poblacion,
      provincia,
      estado: estadoActual,
      cuenta_cotizacion,
      email,
      password,
    });
    return normalizeTrabajador(response.data);
  } catch (error) {
    console.error("Error editando trabajador:", error);
    throw error;
  }
};

// editar un trabajador por DNI
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
  try {
    const response = await api.put(`/trabajador/${dni}`, {
      nombre,
      apellidos,
      puesto,
      direccion,
      codigo_postal,
      poblacion,
      provincia,
      estado: normalizeEstado(Estado.Activo),
      cuenta_cotizacion,
      email,
      password,
    });
    return normalizeTrabajador(response.data);
  } catch (error) {
    console.error("Error editando trabajador por DNI:", error);
    throw error;
  }
};

// eliminar un trabajador
export const eliminarTrabajador = async (
  idTrabajador: number,
): Promise<void> => {
  try {
    await api.delete(`/trabajador/${idTrabajador}`);
  } catch (error) {
    console.error("Error eliminando trabajador:", error);
    throw error;
  }
};

// obtener todos los trabajadores
export const obtenerTrabajadores = async (): Promise<Trabajador[]> => {
  try {
    const response = await api.get("/trabajadores");
    return response.data;
  } catch (error) {
    console.error("Error obteniendo trabajadores:", error);
    throw error;
  }
};

// obtener un trabajador por ID
export const obtenerTrabajador = async (
  idTrabajador: number,
): Promise<Trabajador> => {
  try {
    const response = await api.get(`/trabajador/${idTrabajador}`);
    return response.data;
  } catch (error) {
    console.error("Error obteniendo trabajador:", error);
    throw error;
  }
};

// obtener un trabajador por email y contraseña (login)
export const getTrabajadorByEmailYContraseña = async (
  email: string,
  password: string,
): Promise<Trabajador> => {
  try {
    const response = await api.get(`/trabajador/${email}/${password}`);
    return normalizeTrabajador(response.data);
  } catch (error) {
    console.error("Error obteniendo trabajador por email y contraseña:", error);
    throw error;
  }
};

export const obtenerTrabajadorPorEmailYPassword =
  getTrabajadorByEmailYContraseña;

// obtener empresas de un trabajador
export const obtenerEmpresasTrabajador = async (
  idTrabajador: number,
): Promise<Empresa[]> => {
  try {
    const response = await api.get(`/trabajador/${idTrabajador}/empresas`);
    return response.data;
  } catch (error) {
    console.error("Error obteniendo empresas del trabajador:", error);
    throw error;
  }
};

// obtener fichajes de un trabajador
export const obtenerFichajesTorabajador = async (
  idTrabajador: number,
): Promise<Fichaje[]> => {
  try {
    const response = await api.get(`/trabajador/${idTrabajador}/fichajes`);
    return response.data;
  } catch (error) {
    console.error("Error obteniendo fichajes del trabajador:", error);
    throw error;
  }
};

// obtener horarios de un trabajador
export const obtenerHorariosTrabajador = async (
  idTrabajador: number,
): Promise<Horario[]> => {
  try {
    const response = await api.get(`/trabajador/${idTrabajador}/horarios`);
    return response.data;
  } catch (error) {
    console.error("Error obteniendo horarios del trabajador:", error);
    throw error;
  }
};

// agregar empresa a un trabajador
export const agregarEmpresaATrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<void> => {
  try {
    await api.put(`/trabajador/${idTrabajador}/empresas/${idEmpresa}`);
  } catch (error) {
    console.error("Error agregando empresa al trabajador:", error);
    throw error;
  }
};

// eliminar empresa de un trabajador
export const eliminarEmpresaDeTrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<void> => {
  try {
    await api.delete(`/trabajador/${idTrabajador}/empresas/${idEmpresa}`);
  } catch (error) {
    console.error("Error eliminando empresa del trabajador:", error);
    throw error;
  }
};

// agregar horario a un trabajador
export const agregarHorarioATrabajador = async (
  idTrabajador: number,
  idHorario: number,
): Promise<void> => {
  try {
    await api.put(`/trabajador/${idTrabajador}/horarios/${idHorario}`);
  } catch (error) {
    console.error("Error agregando horario al trabajador:", error);
    throw error;
  }
};

// agregar fichaje a un trabajador
export const agregarFichajeATrabajador = async (
  idTrabajador: number,
  idFichaje: number,
): Promise<void> => {
  try {
    await api.put(`/trabajador/${idTrabajador}/fichajes/${idFichaje}`);
  } catch (error) {
    console.error("Error agregando fichaje al trabajador:", error);
    throw error;
  }
};

export const editarEstadoTrabajador = async (
  dni: string,
  estado: Estado,
): Promise<Trabajador> => {
  try {
    const response = await api.patch(`/trabajador/${dni}/estado`, {
      estado: normalizeEstado(estado),
    });
    return normalizeTrabajador(response.data);
  } catch (error) {
    console.error("Error editando estado del trabajador:", error);
    throw error;
  }
};

export const getUltimoFichajeTrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Fichaje | null> => {
  try {
    const fichajes = await obtenerFichajesEmpresaTrabajador(
      idTrabajador,
      idEmpresa,
    );
    if (!fichajes || fichajes.length === 0) {
      return null;
    }
    const ultimo = fichajes.reduce((prev, current) => {
      const prevTime = new Date(prev.fecha_hora).getTime();
      const currentTime = new Date(current.fecha_hora).getTime();
      return currentTime > prevTime ? current : prev;
    });
    return ultimo;
  } catch (error) {
    console.error("Error obteniendo último fichaje:", error);
    throw error;
  }
};

export const obtenerFichajesEmpresaTrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Fichaje[]> => {
  try {
    const response = await api.get(
      `/fichajes/trabajador/${idTrabajador}/empresa/${idEmpresa}`,
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error obteniendo fichajes del trabajador en la empresa:",
      error,
    );
    throw error;
  }
};
