// ==========================================
// ENUMS PARA AUSENCIAS Y ESTADOS (FRONTEND)
// Sincronizados con el backend de FastAPI
// ==========================================

export enum TipoAusencia {
  VACACIONES = "Vacaciones",
  BAJA_TEMPORAL = "Baja_temporal",
  MATERNIDAD_PATERNIDAD = "Maternidad_paternidad",
  PERMISO_RETRIBUIDO = "Permiso_retribuido",
  AUSENCIA_INJUSTIFICADA = "Ausencia_injustificada",
}

export enum EstadoAusencia {
  PENDIENTE = "Pendiente",
  APROBADA = "Aprobada",
  RECHAZADA = "Rechazada",
}

/**
 * Interface para el payload de envío (POST /api/ausencias)
 * Replica exactamente el esquema 'AusenciaCreate' de FastAPI
 */
export interface AusenciaCreateRequest {
  empresa_id: string; // UUID
  trabajador_id: string; // UUID
  tipo_ausencia: TipoAusencia;
  fecha_inicio: string; // Formato AAAA-MM-DD
  fecha_fin: string; // Formato AAAA-MM-DD
  motivo: string;
  justificante_metadata?: Record<string, any>;
}

/**
 * Interface para el objeto completo devuelto por el servidor
 * Replica el esquema 'AusenciaResponse' y el modelo SQLAlchemy 'Ausencias'
 */
export interface AusenciaResponse {
  id: string; // UUID
  empresa_id: string; // UUID
  trabajador_id: string; // UUID
  tipo_ausencia: TipoAusencia;
  estado: EstadoAusencia;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  justificante_metadata: Record<string, any> | null;
  created_at: string; // Timestamp ISO
  updated_at: string; // Timestamp ISO

  // Campos de auditoría y resolución de RRHH (opcionales)
  validado_por_usuario_id?: string | null; // UUID
  fecha_resolucion?: string | null; // Timestamp ISO
  observaciones_admin?: string | null;
}

/**
 * Interface ligera optimizada para listados e items rápidos en tablas o tarjetas.
 */
export interface ItemAusencia {
  id: string;
  trabajador_id: string;
  tipo_ausencia: TipoAusencia;
  estado: EstadoAusencia;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
}
