import {
  AccionPermisoEnum,
  AlcancePermisoEnum,
  TipoPermisoEnum,
  TipoRolEnum,
} from "../constants/enums";
import { useSesion } from "../modules/usuarios/store/SesionContextZustand";

/**
 * Hook centralizado para la comprobación reactiva de permisos (PBAC) y roles (RBAC).
 * Permite renderizar y habilitar condicionalmente acciones según la matriz del backend.
 */
export function usePermisos() {
  const { tienePermiso, usuarioActual, rolActual, accesos, empresaActual } =
    useSesion();

  // Comprobar si el usuario actual es Superadministrador global
  const esSuperadministrador =
    rolActual === TipoRolEnum.SUPERADMINISTRADOR ||
    usuarioActual?.tipo_usuario === TipoRolEnum.SUPERADMINISTRADOR ||
    accesos.some(
      (a) =>
        a.empresa_id === null &&
        a.rol.tipo === TipoRolEnum.SUPERADMINISTRADOR,
    );

  // Obtener el acceso activo correspondiente a la empresa seleccionada o contexto actual
  const accesoActivo =
    accesos.find((a) => a.empresa_id === empresaActual?.id) ??
    accesos.find((a) => a.empresa_id === usuarioActual?.empresa_id) ??
    accesos[0];

  // Resolver tipo de rol activo en el tenant actual
  const tipoRolActivo =
    accesoActivo?.rol.tipo ?? rolActual ?? usuarioActual?.tipo_usuario;

  // Banderas de conveniencia por tipo de rol base del sistema
  const esAdminEmpresa = tipoRolActivo === TipoRolEnum.ADMIN_EMPRESA;
  const esAdminGestoria = tipoRolActivo === TipoRolEnum.ADMIN_GESTORIA;
  const esRRHH = tipoRolActivo === TipoRolEnum.RRHH;
  const esTrabajador = tipoRolActivo === TipoRolEnum.TRABAJADOR;
  const esAuditor = tipoRolActivo === TipoRolEnum.AUDITOR_ITSS;
  const esRepresentanteLegal = tipoRolActivo === TipoRolEnum.REPRESENTANTE_LEGAL;
  const esOtro = tipoRolActivo === TipoRolEnum.OTRO;

  // Funciones de comprobación de acciones específicas (consultar, crear, modificar, eliminar, exportar, importar)
  const puedeConsultar = (
    recurso: TipoPermisoEnum | string,
    alcance?: AlcancePermisoEnum | string,
  ): boolean => tienePermiso(recurso, AccionPermisoEnum.CONSULTAR, alcance);

  const puedeCrear = (
    recurso: TipoPermisoEnum | string,
    alcance?: AlcancePermisoEnum | string,
  ): boolean => tienePermiso(recurso, AccionPermisoEnum.CREAR, alcance);

  const puedeModificar = (
    recurso: TipoPermisoEnum | string,
    alcance?: AlcancePermisoEnum | string,
  ): boolean => tienePermiso(recurso, AccionPermisoEnum.MODIFICAR, alcance);

  const puedeEliminar = (
    recurso: TipoPermisoEnum | string,
    alcance?: AlcancePermisoEnum | string,
  ): boolean => tienePermiso(recurso, AccionPermisoEnum.ELIMINAR, alcance);

  const puedeExportar = (
    recurso: TipoPermisoEnum | string,
    alcance?: AlcancePermisoEnum | string,
  ): boolean => tienePermiso(recurso, AccionPermisoEnum.EXPORTAR, alcance);

  const puedeImportar = (
    recurso: TipoPermisoEnum | string,
    alcance?: AlcancePermisoEnum | string,
  ): boolean => tienePermiso(recurso, AccionPermisoEnum.IMPORTAR, alcance);

  return {
    tienePermiso,
    puedeConsultar,
    puedeCrear,
    puedeModificar,
    puedeEliminar,
    puedeExportar,
    puedeImportar,
    tipoRolActivo,
    esSuperadministrador,
    esAdminEmpresa,
    esAdminGestoria,
    esRRHH,
    esTrabajador,
    esAuditor,
    esRepresentanteLegal,
    esOtro,
  };
}

