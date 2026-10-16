import React from "react";
import {
  AccionPermisoEnum,
  AlcancePermisoEnum,
  TipoPermisoEnum,
} from "../../constants/enums";
import { usePermisos } from "../../hooks/usePermisos";

interface CanProps {
  /** Recurso sobre el que se requiere la autorización (ej: 'fichajes', 'empresas') */
  recurso: TipoPermisoEnum | string;
  /** Acción que se desea ejecutar (ej: 'consultar', 'crear', 'modificar', 'eliminar', 'exportar', 'importar') */
  accion: AccionPermisoEnum | string;
  /** Alcance opcional exigido ('propio', 'empresa', 'global') */
  alcance?: AlcancePermisoEnum | string;
  /** Elemento a mostrar si se cuenta con el permiso */
  children: React.ReactNode;
  /** Elemento alternativo a mostrar si NO se cuenta con el permiso (por defecto null) */
  fallback?: React.ReactNode;
  /** Si es true, invierte la condición: renderiza children cuando NO se cuenta con el permiso */
  not?: boolean;
}

/**
 * Componente declarativo de control de acceso basado en permisos (PBAC).
 * Condiciona la visibilidad de botones, formularios y secciones según la matriz efectiva.
 */
export function Can({
  recurso,
  accion,
  alcance,
  children,
  fallback = null,
  not = false,
}: CanProps) {
  const { tienePermiso } = usePermisos();

  const autorizado = tienePermiso(recurso, accion, alcance);
  const debeRenderizar = not ? !autorizado : autorizado;

  if (!debeRenderizar) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

