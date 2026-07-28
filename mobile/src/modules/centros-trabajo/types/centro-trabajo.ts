import { Empresa } from "../../empresas/types/empresa";

/**
 * Representa un centro de trabajo o sede física (Tabla: centros_trabajo)
 */
export interface CentroTrabajo {
  id: string; // Mapea uuid.UUID (gen_random_uuid)
  empresa_id: string; // Mapea uuid.UUID (tenant)
  nombre: string; // Mapea String(255)
  zona_horaria: string; // Mapea String(50), por defecto "Europe/Madrid"
  activo: boolean; // Mapea Boolean
  created_at: string; // Mapea DateTime(True) en formato ISO string
  updated_at: string; // Mapea DateTime(True) en formato ISO string
  codigo_ccc?: string | null; // Código de Cuenta de Cotización (opcional)
  direccion?: string | null; // Dirección física o postal (opcional)

  // Relación opcional para carga anidada (eager loading)
  empresa?: Empresa | null;
}

/**
 * Esquema para la creación de un nuevo centro de trabajo
 */
export interface CentroTrabajoCreate {
  empresa_id: string; // Identificador UUID de la empresa (tenant)
  nombre: string; // Nombre identificativo de la sede física
  activo: boolean;
  zona_horaria?: string; // Zona horaria (por defecto "Europe/Madrid")
  codigo_ccc?: string | null; // Código de Cuenta de Cotización (opcional)
  direccion?: string | null; // Dirección física (opcional)
}

/**
 * Esquema para la actualización parcial (patch) de un centro de trabajo
 */
export interface CentroTrabajoUpdate {
  nombre?: string;
  zona_horaria?: string;
  activo?: boolean;
  codigo_ccc?: string | null;
  direccion?: string | null;
}
