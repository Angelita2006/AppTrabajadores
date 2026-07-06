import { Festivo } from "../../festivos/types/festivo";

export interface CalendarioFestivo {
  id: string;
  anio: number;
  festivos: Festivo[];
}
