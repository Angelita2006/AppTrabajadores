// contadores para generar ids únicos
let idsEmpresas = 0;
let idsTrabajadores = 0;
let idsFichajes = 0;

// modelo de Empresa
export interface Empresa {
  id: number;
  nombre: string;
  cif: string;
  trabajadores?: number[];
}

// modelo de Trabajador
export interface Trabajador {
  id: number;
  empresas?: number[];
  fichajes?: number[];
  dni: string;
  nombre: string;
  puesto: string;
  email: string;
  password: string;
}

// modelo de Fichaje
export interface Fichaje {
  id: number;
  trabajadorId: number;
  empresaId?: number;
  tipo: "entrada" | "salida" | "descanso" | "horas_extra";
  fecha: Date;
  ubicacion?: { lat: number; lng: number };
}

// Funciones para manejar los fichajes

// crea un nuevo fichaje
export const crearFichaje = (
  trabajadorId: number,
  empresaId: number,
  tipo: "entrada" | "salida" | "descanso" | "horas_extra",
): Fichaje => {
  const fichaje = {
    id: idsFichajes++,
    trabajadorId,
    empresaId,
    tipo,
    fecha: new Date(),
  };
  fichajes.push(fichaje);
  return fichaje;
};
// obtiene los fichajes de un trabajador en una empresa específica
export const obtenerFichajes = (
  trabajadorId: number,
  empresaId: number,
): Fichaje[] => {
  return fichajes.filter(
    (f) => f.trabajadorId === trabajadorId && f.empresaId === empresaId,
  );
};

// Funciones para manejar las empresas

// agrega una empresa a un trabajador y viceversa
export const agregarEmpresa = (
  trabajadorId: number,
  nombre: string,
  cif: string,
) => {
  let trabajador = getTrabajadorById(trabajadorId);
  let empresa = crearEmpresa(nombre, cif);
  Promise.resolve(trabajador).then((trabajador) => {
    if (trabajador && empresa) {
      // si el trabajador no tiene la empresa en su lista, la agregamos
      if (!trabajador.empresas?.find((id) => id === empresa.id)) {
        trabajador.empresas = [];
        trabajador.empresas.push(empresa.id);
      }
      // si la empresa no tiene el trabajador en su lista, lo agregamos
      if (
        !empresa.trabajadores?.find(
          (trabajadorId) => trabajadorId === trabajador.id,
        )
      ) {
        empresa.trabajadores = [];
        empresa.trabajadores.push(trabajadorId);
      }
    }
  });
};
// crea una nueva empresa
export const crearEmpresa = (nombre: string, cif: string): Empresa => ({
  id: idsEmpresas++,
  nombre,
  cif,
});
// obtiene una empresa por su id
export const getEmpresa = async (id: number): Promise<Empresa> => {
  try {
    const response = await fetch(`/api/empresa?id=${id}`);
    const data = (await response).json();
    return data as unknown as Empresa;
  } catch (error) {
    console.error("Error fetching empresa:", error);
    return "Empresa no encontrada" as unknown as Empresa;
  }
};
//obtiene todas las empresas disponibles
export const obtenerEmpresas = (): Empresa[] => {
  return empresas;
};

// Funciones para manejar los trabajadores

// obtiene las empresas a las que pertenece un trabajador
export const obtenerEmpresasTrabajador = (trabajadorId: number): Empresa[] => {
  const trabajador = trabajadores.find((t) => t.id === trabajadorId);
  if (!trabajador) return [];
  return empresas.filter((e) => trabajador.empresas?.includes(e.id));
};

// crea un nuevo trabajador
export const crearTrabajador = (
  nombre: string,
  dni: string,
  puesto: string,
  email: string,
  password: string,
  empresas: string[] = [],
): Trabajador => ({
  id: idsTrabajadores++,
  nombre,
  dni,
  puesto,
  email,
  password,
});

// obtiene un trabajador por su id
export const getTrabajadorById = async (id: number): Promise<Trabajador> => {
  try {
    const response = await fetch(`/api/trabajador?id=${id}`);
    const data = (await response).json();
    return data as unknown as Trabajador;
  } catch (error) {
    console.error("Error fetching trabajador:", error);
    return "Trabajador no encontrado" as unknown as Trabajador;
  }
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

// datos de ejemplo de empresas
const empresas: Empresa[] = [
  crearEmpresa("Bullastec", "B12345678"),
  crearEmpresa("Butemur", "B87654321"),
];
// datos de ejemplo de trabajadores
const trabajadores: Trabajador[] = [
  crearTrabajador(
    "Manolo",
    "12345678A",
    "Desarrollador",
    "manolo@example.com",
    "password123",
  ),
  crearTrabajador(
    "Ana",
    "87654321B",
    "Diseñadora",
    "ana@example.com",
    "password456",
  ),
];
// datos de ejemplo de fichajes
const fichajes: Fichaje[] = [];
