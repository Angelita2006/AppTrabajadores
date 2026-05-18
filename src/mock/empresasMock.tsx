import { Empresa } from "../models/empresas";

export const empresas: Empresa[] = [
  {
    id: 1,
    nombre: "Bullastec",
    cif: "B73975112",
    direccion: "C\ Calasparra, 14",
    codigo_postal: "30180",
    poblacion: "Bullas",
    provincia: "Murcia",
    trabajadores: [1, 2],
  },
  {
    id: 2,
    nombre: "Mubutel",
    cif: "B01626076",
    direccion: "Av. Luis de los Reyes, 26 1º",
    codigo_postal: "30180",
    poblacion: "Bullas",
    provincia: "Murcia",
  },
  {
    id: 3,
    nombre: "Butemur",
    cif: "B75866731",
    direccion: "Av. Luis de los Reyes, 26 1º",
    codigo_postal: "30180",
    poblacion: "Bullas",
    provincia: "Murcia",
  },
];
