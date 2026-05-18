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
