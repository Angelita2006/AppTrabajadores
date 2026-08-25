export interface Permiso {
  id: string;
  codigo: string;
  descripcion?: string;
}

export interface PermisoCreate {
  codigo: string;
  descripcion?: string | null;
}

// Códigos/slugs comunes de permisos para blindar componentes visuales (puedes ampliarlo según los que crees en BD)
export enum PermisoEnum {
  FICHAR = "fichajes.fichar",
  CREAR_ROLES = "roles.crear",
  VER_AUDITORIA = "auditoria.ver",
  GESTIONAR_EMPRESA = "empresa.gestionar",
}
