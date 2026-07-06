export interface Festivo {
  id: string;
  fecha: string;
  descripcion: string;
  tipo: "nacional" | "autonomico" | "local";
}
