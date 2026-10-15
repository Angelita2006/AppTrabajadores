/**
 * Enumeraciones serializadas por la API. Mantener sus valores alineados con
 * backend/core/enums.py: son los strings que viajan en JSON y no etiquetas UI.
 */
export const EstadoTrabajadorEnum = {
  INACTIVO: "Inactivo",
  ACTIVO: "Activo",
  TRABAJANDO: "Trabajando",
  DESCANSANDO: "Descansando",
  HORAS_EXTRA: "Haciendo_horas_extra",
  VACACIONES: "De_vacaciones",
  BAJA: "De_baja",
  AUSENTE: "Ausente",
} as const;
export type EstadoTrabajadorEnum = (typeof EstadoTrabajadorEnum)[keyof typeof EstadoTrabajadorEnum];

export const AccionAuditoriaEnum = {
  CONSULTA: "Consulta", CREACION: "Creación", MODIFICACION: "Modificación",
  BAJA_LOGICA: "Baja_lógica", ELIMINACION: "Eliminación", EXPORTACION: "Exportación",
  IMPORTACION: "Importación", DESCARGA: "Descarga", ACCESO_DENEGADO: "Acceso_denegado",
} as const;
export type AccionAuditoriaEnum = (typeof AccionAuditoriaEnum)[keyof typeof AccionAuditoriaEnum];

export const AccionRetencionEnum = { ARCHIVAR: "Archivar", ANONIMIZAR: "Anonimizar", ELIMINAR: "Eliminar" } as const;
export type AccionRetencionEnum = (typeof AccionRetencionEnum)[keyof typeof AccionRetencionEnum];

export const EstadoCorreccionEnum = { PENDIENTE: "Pendiente", APROBADA: "Aprobada", RECHAZADA: "Rechazada" } as const;
export type EstadoCorreccionEnum = (typeof EstadoCorreccionEnum)[keyof typeof EstadoCorreccionEnum];

export const EstadoFichajeEnum = { VALIDO: "Válido", PENDIENTE_REVISION: "Pendiente_revisión" } as const;
export type EstadoFichajeEnum = (typeof EstadoFichajeEnum)[keyof typeof EstadoFichajeEnum];

export const MetodoFichajeEnum = {
  APP_MOVIL: "App_móvil", TERMINAL_RFID: "Terminal_rfid", TERMINAL_PIN: "Terminal_pin",
  LECTOR_QR: "Lector_qr", WEB: "Web", GEOLOCALIZACION: "Geolocalización", MANUAL: "Manual",
} as const;
export type MetodoFichajeEnum = (typeof MetodoFichajeEnum)[keyof typeof MetodoFichajeEnum];

export const OrigenFichajeEnum = { TRABAJADOR: "Trabajador", CORRECCION_RRHH: "Corrección_rrhh", SISTEMA: "Sistema" } as const;
export type OrigenFichajeEnum = (typeof OrigenFichajeEnum)[keyof typeof OrigenFichajeEnum];

export const TipoEventoFichajeEnum = { ENTRADA: "Entrada", SALIDA: "Salida", INICIO_PAUSA: "Inicio_pausa", FIN_PAUSA: "Fin_pausa" } as const;
export type TipoEventoFichajeEnum = (typeof TipoEventoFichajeEnum)[keyof typeof TipoEventoFichajeEnum];

export const TipoContratoEnum = {
  INDEFINIDO: "Indefinido", TEMPORAL: "Temporal", FORMACION: "Formación",
  PRACTICAS: "Prácticas", FIJO_DISCONTINUO: "Fijo_discontinuo", OTRO: "Otro",
} as const;
export type TipoContratoEnum = (typeof TipoContratoEnum)[keyof typeof TipoContratoEnum];

export const TipoCorreccionEnum = { ALTA_MANUAL: "Alta_manual", MODIFICACION: "Modificación", ANULACION: "Anulación" } as const;
export type TipoCorreccionEnum = (typeof TipoCorreccionEnum)[keyof typeof TipoCorreccionEnum];

export const TipoJornadaEnum = { COMPLETA: "Completa", PARCIAL: "Parcial" } as const;
export type TipoJornadaEnum = (typeof TipoJornadaEnum)[keyof typeof TipoJornadaEnum];

export const TipoAusenciaEnum = {
  VACACIONES: "Vacaciones", BAJA_TEMPORAL: "Baja_temporal", MATERNIDAD_PATERNIDAD: "Maternidad_paternidad",
  PERMISO_RETRIBUIDO: "Permiso_retribuido", ASUNTOS_PROPIOS: "Asuntos_propios", AUSENCIA_INJUSTIFICADA: "Ausencia_injustificada",
} as const;
export type TipoAusenciaEnum = (typeof TipoAusenciaEnum)[keyof typeof TipoAusenciaEnum];

export const TipoRolEnum = {
  SUPERADMINISTRADOR: "Superadministrador", ADMIN_GESTORIA: "Admin_gestoría", ADMIN_EMPRESA: "Admin_empresa",
  RRHH: "Rrhh", REPRESENTANTE_LEGAL: "Representante_legal", TRABAJADOR: "Trabajador", AUDITOR_ITSS: "Auditor_itss", OTRO: "Otro",
} as const;
export type TipoRolEnum = (typeof TipoRolEnum)[keyof typeof TipoRolEnum];

export const EstadoAusenciaEnum = { PENDIENTE: "Pendiente", APROBADA: "Aprobada", RECHAZADA: "Rechazada", CANCELADA: "Cancelada" } as const;
export type EstadoAusenciaEnum = (typeof EstadoAusenciaEnum)[keyof typeof EstadoAusenciaEnum];

export const TipoFestivoEnum = { LOCAL: "Local", AUTONOMICO: "Autonómico", NACIONAL: "Nacional" } as const;
export type TipoFestivoEnum = (typeof TipoFestivoEnum)[keyof typeof TipoFestivoEnum];

export const PlanLicenciaEnum = { BASICO: "Básico", PRO: "Pro", ENTERPRISE: "Enterprise" } as const;
export type PlanLicenciaEnum = (typeof PlanLicenciaEnum)[keyof typeof PlanLicenciaEnum];
export const CicloFacturacionEnum = { TRIAL: "Trial", MENSUAL: "Mensual", ANUAL: "Anual" } as const;
export type CicloFacturacionEnum = (typeof CicloFacturacionEnum)[keyof typeof CicloFacturacionEnum];
export const EstadoSuscripcionEnum = { TRIALING: "Trialing", ACTIVA: "Activa", VENCIDA: "Vencida", CANCELADA: "Cancelada" } as const;
export type EstadoSuscripcionEnum = (typeof EstadoSuscripcionEnum)[keyof typeof EstadoSuscripcionEnum];

export const TipoPermisoEnum = {
  ASIGNACIONES_TURNO: "asignaciones_turno", AUDITORIA_ACCESOS: "auditoria_accesos", AUSENCIAS: "ausencias",
  CALENDARIOS_LABORALES: "calendarios_laborales", CENTROS_TRABAJO: "centros_trabajo", CONTRATOS_CALENDARIOS: "contratos_calendarios",
  CONTRATOS: "contratos", CORRECCIONES_FICHAJE: "correcciones_fichaje", DEPARTAMENTOS: "departamentos",
  DISPOSITIVOS_FICHAJE: "dispositivos_fichaje", EMPRESAS: "empresas", FESTIVOS: "festivos", FICHAJES: "fichajes",
  GESTORIAS_EMPRESAS: "gestorias_empresas", LICENCIAS: "licencias", MOTIVOS_PAUSA: "motivos_pausa", PERMISOS: "permisos",
  POLITICAS_RETENCION: "politicas_retencion", RESUMENES_JORNADA: "resumenes_jornada", ROLES_PERMISOS: "roles_permisos",
  ROLES: "roles", TRABAJADORES: "trabajadores", TURNOS: "turnos", USUARIOS_EMPRESAS: "usuarios_empresas", USUARIOS: "usuarios",
} as const;
export type TipoPermisoEnum = (typeof TipoPermisoEnum)[keyof typeof TipoPermisoEnum];
export const AccionPermisoEnum = { CONSULTAR: "consultar", CREAR: "crear", MODIFICAR: "modificar", ELIMINAR: "eliminar", IMPORTAR: "importar", EXPORTAR: "exportar" } as const;
export type AccionPermisoEnum = (typeof AccionPermisoEnum)[keyof typeof AccionPermisoEnum];
export const AlcancePermisoEnum = { PROPIO: "propio", EMPRESA: "empresa", GLOBAL: "global" } as const;
export type AlcancePermisoEnum = (typeof AlcancePermisoEnum)[keyof typeof AlcancePermisoEnum];
