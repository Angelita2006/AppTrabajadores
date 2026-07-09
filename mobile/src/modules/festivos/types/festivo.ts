export interface Festivo {
  id: string;
  fecha: string;
  descripcion: string;
  tipo: "Nacional" | "Autonómico" | "Local";
}

export interface FestivoCreate {
  calendario_id: string;
  fecha: string;
  tipo: "Nacional" | "Autonómico" | "Local";
  descripcion: string;
}

export interface FestivoUpdate {
  nueva_fecha?: string;
  nuevo_tipo?: "Nacional" | "Autonómico" | "Local";
  nueva_descripcion?: string;
}
