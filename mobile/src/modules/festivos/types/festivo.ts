export interface Festivo {
  id: string; // UUID en backend
  calendario_id: string; // Añadido: Obligatorio para relacionarlo
  fecha: string; // Formato "AAAA-MM-DD"
  descripcion?: string | null;
  tipo: "nacional" | "autonomico" | "local" | string; // Minúsculas para coincidir con el valor por defecto del backend ("nacional")
}

export interface FestivoCreate {
  calendario_id: string;
  fecha: string;
  tipo?: "nacional" | "autonomico" | "local" | string;
  descripcion?: string | null;
}

export interface FestivoUpdate {
  nueva_fecha?: string;
  nuevo_tipo?: "nacional" | "autonomico" | "local" | string;
  nueva_descripcion?: string | null;
}
