export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface RolCreate {
  nombre: string;
  descripcion?: string;
}

// Roles básicos del sistema para la lógica de negocio y vistas
export enum RolEnum {
  ADMIN = "Administrador",
  RECURSOS_HUMANOS = "Recursos Humanos",
  INSPECTOR = "Inspector",
  TRABAJADOR = "Trabajador",
}
