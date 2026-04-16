let idsEmpresas = 0;
let idsTrabajadores = 0;
let idsFichajes = 0;

export interface Empresa {
  id: number;
  nombre: string;
  cif: string;
  trabajadores?: number[];
}

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

export interface Fichaje {
  id: number;
  trabajadorId: number;
  empresaId?: number;
  tipo: "entrada" | "salida" | "descanso" | "horas_extra";
  fecha: Date;
  ubicacion?: { lat: number; lng: number };
}

export const obtenerFichajes = (trabajadorId: number): Fichaje[] => {
  return fichajes.filter((f) => f.trabajadorId === trabajadorId);
};

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

export const agregarEmpresa = (
  trabajadorId: number,
  nombre: string,
  cif: string,
) => {
  let trabajador = getTrabajador(trabajadorId);
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

export const crearEmpresa = (nombre: string, cif: string): Empresa => ({
  id: idsEmpresas++,
  nombre,
  cif,
});

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

export const getTrabajador = async (id: number): Promise<Trabajador> => {
  try {
    const response = await fetch(`/api/trabajador?id=${id}`);
    const data = (await response).json();
    return data as unknown as Trabajador;
  } catch (error) {
    console.error("Error fetching trabajador:", error);
    return "Trabajador no encontrado" as unknown as Trabajador;
  }
};

const empresas: Empresa[] = [
  crearEmpresa("Bullastec", "B12345678"),
  crearEmpresa("Butemur", "B87654321"),
];

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

const fichajes: Fichaje[] = [];

export const obtenerEmpresasTrabajador = (trabajadorId: number): Empresa[] => {
  const trabajador = trabajadores.find((t) => t.id === trabajadorId);
  if (!trabajador) return [];
  return empresas.filter((e) => trabajador.empresas?.includes(e.id));
};
