import { fichajes } from "../mock/fichajesMock";
import { trabajadores } from "../mock/trabajadoresMock";
import { Fichaje } from "../models/fichajes";
import { Estado, Trabajador } from "../models/trabajadores";
// import { obtenerEmpresas } from "./empresasService";

let idsTrabajadores = Math.max(...trabajadores.map((t) => t.id), 0);

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
  estado: Estado.Inactivo,
  email,
  password,
  empresas: [],
  horarios: [],
  fichajes: [],
});

export const editarTrabajador = (
  dni: string,
  nombre: string,
  apellidos: string,
  direccion: string,
  codigo_postal: string,
  poblacion: string,
  provincia: string,
  cuenta_cotizacion: string,
  puesto: string,
  estado: Estado,
  email: string,
  password: string,
): Trabajador => {
  const trabajador = trabajadores.find((t) => t.dni === dni);
  if (!trabajador) {
    throw new Error("Trabajador no encontrado");
  }
  trabajador.dni = dni;
  trabajador.nombre = nombre;
  trabajador.apellidos = apellidos;
  trabajador.direccion = direccion;
  trabajador.codigo_postal = codigo_postal;
  trabajador.poblacion = poblacion;
  trabajador.provincia = provincia;
  trabajador.cuenta_cotizacion = cuenta_cotizacion;
  trabajador.puesto = puesto;
  trabajador.email = email;
  trabajador.password = password;
  trabajador.estado = estado;
  return trabajador;
};

export const editarEstadoTrabajador = (
  dni: string,
  estado: Estado,
): Trabajador => {
  const trabajador = trabajadores.find((t) => t.dni === dni);
  if (!trabajador) {
    throw new Error("Trabajador no encontrado");
  }
  trabajador.estado = estado;
  return trabajador;
};

// obtiene las empresas a las que pertenece un trabajador
// export const obtenerEmpresasTrabajador = async (
//   trabajadorId: number,
// ): Promise<Empresa[]> => {
//   const { obtenerEmpresas } = await require("./empresasService");
//   const trabajador = trabajadores.find((t) => t.id === trabajadorId);
//   if (!trabajador) return [];
//   return (await obtenerEmpresas()).filter((e: { id: number }) =>
//     trabajador.empresas?.includes(e.id),
//   );
// };

// obtiene un trabajador por su id
export const getTrabajadorById = (id: number): Trabajador => {
  try {
    const trabajador = trabajadores.find((t) => t.id === id);
    return trabajador || ("Trabajador no encontrado" as unknown as Trabajador);
  } catch (error) {
    console.error("Error fetching trabajador:", error);
    return "Trabajador no encontrado" as unknown as Trabajador;
  }
};

// obtiene un trabajador por su email y contraseña (para iniciar sesión)
export const getTrabajadorByEmailYContraseña = async (
  email: string,
  password: string,
): Promise<Trabajador> => {
  try {
    const trabajador = trabajadores.find(
      (t) => t.email === email && t.password === password,
    );
    return trabajador || ("Trabajador no encontrado" as unknown as Trabajador);
  } catch (error) {
    console.error("Error fetching trabajador:", error);
    return "Trabajador no encontrado" as unknown as Trabajador;
  }
};

export const getUltimoFichajeTrabajador = (idTrabajador: number): Fichaje => {
  const trabajador = trabajadores.find((t) => t.id === idTrabajador);
  if (!trabajador || !trabajador.fichajes || trabajador.fichajes.length === 0) {
    return "Sin fichajes aún" as unknown as Fichaje;
  }
  let ultimoFichaje: Fichaje = {} as unknown as Fichaje; // Inicializamos con un valor vacío
  trabajador.fichajes.forEach((f) => {
    const fichaje = fichajes.find((fi) => fi.id === f) || ({} as Fichaje);
    if (!ultimoFichaje || fichaje.fecha > ultimoFichaje.fecha) {
      ultimoFichaje = fichaje;
    }
  });
  return ultimoFichaje;
};
