export enum Estado {
  Inactivo,
  Activo,
  Trabajando,
  Descansando,
  HorasExtra,
  Vacaciones,
  Baja,
}

export interface Trabajador {
  id: number;
  empresas?: number[];
  fichajes?: number[];
  horarios?: number[];
  // role: 'user' = normal trabajador, 'admin' = can see/manage all empresas
  role?: "user" | "admin";
  dni: string;
  nombre: string;
  apellidos: string;
  direccion: string;
  codigo_postal: string;
  poblacion: string;
  provincia: string;
  cuenta_cotizacion: string;
  puesto: string;
  estado?: Estado;
  email: string;
  password: string;
}
