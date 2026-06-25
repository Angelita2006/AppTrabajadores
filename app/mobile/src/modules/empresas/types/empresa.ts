/**
 * Representa el modelo de una Empresa cliente (Tenant) en el frontend,
 * sincronizado exactamente con el esquema de respuesta del backend (Pydantic / SQLAlchemy).
 */
export interface Empresa {
  // Identificadores y Estados del Sistema
  /** Identificador único UUID autogenerado en formato string. */
  id: string;
  /** Determina si la empresa se encuentra operativa en el sistema. */
  activa: boolean;

  // Información Fiscal y Comercial Obligatoria
  /** Razón social o denominación legal de la empresa. */
  razon_social: string;
  /** Código de Identificación Fiscal único (ej: A1234567B). */
  cif: string;

  // Información de Configuración
  /** Zona horaria por defecto para la jornada (ej: "Europe/Madrid"). */
  zona_horaria: string;
  /** Ajustes y parámetros avanzados de la empresa (JSON mapeado a objeto). */
  configuracion: Record<string, any>;

  // Datos Fiscales y de Negocio Opcionales
  /** Nombre comercial o marca pública (opcional). */
  nombre_comercial?: string | null;
  /** Clasificación Nacional de Actividades Económicas (opcional). */
  codigo_cnae?: string | null;
  /** Convenio colectivo de aplicación sectorial (opcional). */
  convenio_colectivo?: string | null;
  /** Domicilio social o fiscal completo de la empresa (opcional). */
  direccion_fiscal?: string | null;

  // Control de Fechas y Auditoría (Strings en formato ISO 8601 o Date)
  /** Fecha de alta formal en la plataforma (YYYY-MM-DD). */
  fecha_alta: string;
  /** Fecha de baja del cliente si aplica (YYYY-MM-DD) (opcional). */
  fecha_baja?: string | null;
  /** Marca de tiempo de la creación real del registro. */
  created_at: string;
  /** Marca de tiempo de la última modificación efectuada. */
  updated_at: string;

  // Relaciones (Opcionales dependiendo de si la consulta API incluye los joins)
  /** IDs o datos parciales de los trabajadores asociados (ajustar según el endpoint). */
  trabajadores?: string[];
}
