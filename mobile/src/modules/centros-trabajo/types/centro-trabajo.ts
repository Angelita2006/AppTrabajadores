export interface CentroTrabajo {
  id: string; // Mapea uuid.UUID
  empresa_id: string; // Mapea uuid.UUID
  nombre: string; // Mapea String(255)
  zona_horaria: string; // Mapea String(50)
  activo: boolean; // Mapea Boolean
  created_at: string; // Mapea DateTime(True) en formato ISO string
  updated_at: string; // Mapea DateTime(True) en formato ISO string
  codigo_ccc?: string | null; // Optional[str] -> Puede venir como string, undefined o null
  direccion?: string | null; // Optional[str] Mapped_column(Text)
}

export interface CentroTrabajoCreate {
  empresa_id: string; // Identificador UUID de la empresa (tenant)
  nombre: string; // Nombre de la sede física
  activo: boolean;
  zona_horaria: string; // Zona horaria (ej. "Europe/Madrid")
  codigo_ccc?: string | null; // Código de Cuenta de Cotización (opcional)
  direccion?: string | null; // Dirección física (opcional)
}

export interface CentroTrabajoUpdate {
  nombre?: string;
  zona_horaria?: string;
  activo?: boolean;
  codigo_ccc?: string;
  direccion?: string;
}
