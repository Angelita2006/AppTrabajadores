import { Empresa } from "../../empresas/types/empresa";

/**
 * Listado estático de las diferentes categorías operativas para los tipos de eventos de fichaje.
 * Se utiliza `as const` para congelar los valores y permitir inferir los tipos automáticamente.
 */
export const CATEGORIAS_EVENTO = {
  ENTRADA: "ENTRADA",
  SALIDA: "SALIDA",
  INICIO_PAUSA: "INICIO_PAUSA",
  FIN_PAUSA: "FIN_PAUSA",
} as const;

/**
 * Tipo de unión que representa las diferentes categorías operativas para los tipos de eventos de fichaje.
 */
export type CategoriaEventoEnum =
  (typeof CATEGORIAS_EVENTO)[keyof typeof CATEGORIAS_EVENTO];

/**
 * Diccionario descriptivo para asociar cada categoría de evento de fichaje con su etiqueta legible,
 * tipado dinámicamente en función del type `CategoriaEventoEnum`.
 */
export const CATEGORIA_EVENTO_LABELS: Record<CategoriaEventoEnum, string> = {
  [CATEGORIAS_EVENTO.ENTRADA]: "Entrada",
  [CATEGORIAS_EVENTO.SALIDA]: "Salida",
  [CATEGORIAS_EVENTO.INICIO_PAUSA]: "Inicio de Pausa / Descanso",
  [CATEGORIAS_EVENTO.FIN_PAUSA]: "Fin de Pausa / Reanudación",
};

/**
 * Representa la definición base y completa de un tipo de evento de fichaje en la plataforma (Tabla: tipos_evento_fichaje).
 */
export interface TipoEventoFichaje {
  /** Identificador UUID único del tipo de evento de fichaje. */
  id: string;
  /** Identificador único de la empresa asociada. */
  empresa_id: string;
  /** Código único identificativo del tipo de evento. */
  codigo: string;
  /** Descripción detallada de la naturaleza del evento de fichaje. */
  descripcion: string;
  /** Indicador booleano que determina si el evento computa como tiempo efectivo de trabajo. */
  computa_como_trabajo: boolean;
  /** Indicador booleano que determina si el tipo de evento se encuentra activo. */
  activo?: boolean;

  /** Detalles de la empresa asociada (relación anidada opcional). */
  empresa?: Empresa | null;
}

/**
 * Esquema para la creación o registro de un nuevo tipo de evento de fichaje (POST /api/tipos-evento-fichaje).
 */
export interface TipoEventoFichajeCreate {
  /** Identificador único de la empresa asociada (UUID). */
  empresa_id: string;
  /** Código único identificativo del nuevo tipo de evento. */
  codigo: string;
  /** Descripción detallada del nuevo tipo de evento de fichaje. */
  descripcion: string;
  /** Indicador booleano opcional que determina si el evento computa como tiempo efectivo de trabajo. */
  computa_como_trabajo: boolean;
  /** Indicador booleano opcional que determina si el tipo de evento se encuentra activo. */
  activo?: boolean;
}

/**
 * Esquema para la actualización parcial de un tipo de evento de fichaje existente (PUT /api/tipos-evento-fichaje/{id}).
 */
export interface TipoEventoFichajeUpdate {
  /** Código único identificativo del tipo de evento a modificar. */
  codigo?: string;
  /** Descripción detallada del tipo de evento de fichaje. */
  descripcion?: string;
  /** Indicador booleano que determina si el evento computa como tiempo efectivo de trabajo. */
  computa_como_trabajo?: boolean;
  /** Indicador booleano opcional que determina si el tipo de evento se encuentra activo. */
  activo?: boolean;
}
