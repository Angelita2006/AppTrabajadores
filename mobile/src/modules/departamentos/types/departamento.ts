export interface Departamento {
  id: string; // UUID
  empresa_id: string; // UUID
  nombre: string;
  created_at: string; // Fecha ISO
  updated_at: string; // Fecha ISO
  centro_trabajo_id?: string | null; // Opcional
}
