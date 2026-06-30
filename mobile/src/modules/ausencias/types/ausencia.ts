// // Enums para limitar los estados válidos y evitar errores tipográficos
export enum TipoAusencia {
  vacaciones = "vacaciones",
  baja_temporal = "baja_temporal",
  maternidad_paternidad = "maternidad_paternidad",
  permiso_retribuido = "permiso_retribuido",
  ausencia_injustificada = "ausencia_injustificada",
}

export enum EstadoAusencia {
  pendiente = "pendiente",
  aprobado = "aprobada",
  rechazado = "rechazada",
}

/**
 * Interface para el payload de envío (POST /api/ausencias)
 * Replica exactamente tu esquema 'AusenciaCreate' de FastAPI
 */
export interface AusenciaCreateRequest {
  trabajador_id: string;
  empresa_id: string;
  tipo_ausencia: TipoAusencia;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  justificante_metadata: Record<string, any>;
}

/**
 * Interface para el objeto completo devuelto por el servidor
 * Replica tu esquema 'AusenciaResponse' y el modelo de SQLAlchemy
 */
export interface AusenciaResponse {
  id: string;
  trabajador_id: string;
  empresa_id: string;
  tipo_ausencia: TipoAusencia;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  justificante_metadata: Record<string, any> | null;
  estado: EstadoAusencia;
  created_at: string;
  updated_at: string;
}

export interface ItemAusencia {
  id: string;
  tipo_ausencia: TipoAusencia;
  estado: EstadoAusencia;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
}
