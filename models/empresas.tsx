import { getTrabajadorById } from "./trabajadores";

let idsEmpresas = 0;

// datos de ejemplo de empresas
const empresas: Empresa[] = [
  {
    id: idsEmpresas++,
    nombre: "Bullastec",
    cif: "B73975112",
    direccion: "C\ Calasparra, 14",
    codigo_postal: "30180",
    poblacion: "Bullas",
    provincia: "Murcia",
  },
  {
    id: idsEmpresas++,
    nombre: "Mubutel",
    cif: "B01626076",
    direccion: "Av. Luis de los Reyes, 26 1º",
    codigo_postal: "30180",
    poblacion: "Bullas",
    provincia: "Murcia",
  },
  {
    id: idsEmpresas++,
    nombre: "Butemur",
    cif: "B75866731",
    direccion: "Av. Luis de los Reyes, 26 1º",
    codigo_postal: "30180",
    poblacion: "Bullas",
    provincia: "Murcia",
  },
];

// modelo de Empresa
export interface Empresa {
  id: number;
  nombre: string;
  cif: string;
  direccion: string;
  codigo_postal: string;
  poblacion: string;
  provincia: string;
  trabajadores?: number[];
}

// Funciones para manejar las empresas

// agrega una empresa a un trabajador y viceversa
export const agregarEmpresa = (
  trabajadorId: number,
  nombre: string,
  cif: string,
) => {
  let trabajador = getTrabajadorById(trabajadorId);
  let empresa = { nombre, cif } as unknown as Empresa;
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
export const crearEmpresa = (
  nombre: string,
  cif: string,
  direccion: string,
  codigo_postal: string,
  poblacion: string,
  provincia: string,
): Empresa => ({
  id: idsEmpresas++,
  nombre,
  cif,
  direccion,
  codigo_postal,
  poblacion,
  provincia,
});

// obtiene una empresa por su id
export const getEmpresa = async (id: number): Promise<Empresa> => {
  try {
    const response = await fetch(`/empresas?id=${id}`);
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
