// ENUMS COMPATIBLES
export type TipoCorreccion = "Alta_manual" | "Modificación" | "Anulación";
export enum EstadoCorreccion {
  pendiente = "Pendiente",
  aprobada = "Aprobada",
  rechazada = "Rechazada",
}

/** Payload exacto para 'CorreccionFichajeCreate' */
export interface IncidenciaCreateRequest {
  empresa_id: string;
  trabajador_id: string;
  tipo_correccion: TipoCorreccion;
  valor_nuevo: Record<string, any>; // Bloque JSONB para los nuevos parámetros del fichaje
  motivo: string; // Justificación obligatoria str
  solicitado_por_usuario_id: string; // UUID obligatorio del usuario en sesión
  fichaje_afectado_id?: string | null;
  valor_anterior?: Record<string, any> | null;
}

/** Objeto devuelto por SQLAlchemy 'CorreccionFichajeResponse' */
export interface IncidenciaResponse {
  id: string; // UUID autogenerado en PostgreSQL
  empresa_id: string;
  trabajador_id: string;
  tipo_correccion: TipoCorreccion;
  valor_nuevo: Record<string, any>;
  motivo: string;
  solicitado_por_usuario_id: string;
  estado: EstadoCorreccion;
  fecha_solicitud: string;
  fichaje_afectado_id: string | null;
  valor_anterior: Record<string, any> | null;
  aprobado_por_usuario_id: string | null;
  fecha_resolucion: string | null;
}
