/**
 * Representa la estructura de un Departamento sincronizada
 * exactamente con el esquema DepartamentoResponse del backend.
 */
export interface Departamento {
  id: string; // UUID autogenerado
  empresa_id: string; // UUID de la empresa (tenant)
  nombre: string; // Nombre descriptivo
  centro_trabajo_id?: string | null; // UUID opcional del centro de trabajo
  created_at: string; // Fecha ISO de creación
  updated_at: string; // Fecha ISO de última modificación
}

/**
 * Esquema para la actualización parcial de un departamento,
 * sincronizado con el esquema Pydantic DepartamentoUpdate.
 */
export interface DepartamentoUpdate {
  nombre?: string | null;
  centro_trabajo_id?: string | null;
}
