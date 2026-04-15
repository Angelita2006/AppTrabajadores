let idsEmpresas = 0;
let idsTrabajadores = 0;
let idsFichajes = 0;

export interface Empresa {
  id: number;
  nombre: string;
  cif: string;
}

export interface Trabajador {
  id: number;
  empresas?: string[];
  dni: string;
  nombre: string;
  puesto: string;
  email: string;
  password: string;
}

export interface Fichaje {
  id: number;
  trabajadorId: string;
  entrada: Date;
  salida?: Date;
  ubicacion?: { lat: number; lng: number };
}

export const crearFichaje = (trabajadorId: string): Fichaje => ({
  id: idsFichajes++,
  trabajadorId,
  entrada: new Date(),
});

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

export const getEmpresa = async (): Promise<Empresa | null> => {
  try {
    const response = await fetch("/api/empresa");
    const data = await response.json();
    return data as Empresa;
  } catch (error) {
    console.error("Error fetching empresa:", error);
    return "Empresa no encontrada" as unknown as Empresa;
  }
};
