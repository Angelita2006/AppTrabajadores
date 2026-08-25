export interface TipoEventoFichaje {
  id: string;
  empresa_id?: string | null;
  codigo: string;
  descripcion: string;
  computa_como_trabajo: boolean;
}

export interface TipoEventoFichajeCreate {
  empresa_id?: string | null;
  codigo: string;
  descripcion: string;
  computa_como_trabajo?: boolean;
}

export interface TipoEventoFichajeUpdate {
  codigo?: string;
  descripcion?: string;
  computa_como_trabajo?: boolean;
}

export enum CategoriaEventoEnum {
  ENTRADA = "ENTRADA",
  SALIDA = "SALIDA",
  INICIO_PAUSA = "INICIO_PAUSA",
  FIN_PAUSA = "FIN_PAUSA",
}

export const CATEGORIA_EVENTO_LABELS: Record<CategoriaEventoEnum, string> = {
  [CategoriaEventoEnum.ENTRADA]: "Entrada",
  [CategoriaEventoEnum.SALIDA]: "Salida",
  [CategoriaEventoEnum.INICIO_PAUSA]: "Inicio de Pausa / Descanso",
  [CategoriaEventoEnum.FIN_PAUSA]: "Fin de Pausa / Reanudación",
};
