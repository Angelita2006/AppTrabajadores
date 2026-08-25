export interface UsuarioRol {
  id: string; // UUID
  usuario_id: string; // UUID
  role_id: number;
  empresa_id?: string | null; // UUID o null si es global de gestoría
}

export interface UsuarioRolCreate {
  usuario_id: string;
  role_id: number;
  empresa_id?: string | null;
}

export enum TipoUsuarioEnum {
  ADMIN_GESTORIA = "Admin_gestoría",
  ADMIN_EMPRESA = "Admin_empresa",
  RRHH = "Rrhh",
  REPRESENTANTE_LEGAL = "Representante_legal",
  TRABAJADOR = "Trabajador",
  AUDITOR_ITSS = "Auditor_itss",
}

export const TIPO_USUARIO_LABELS: Record<
  TipoUsuarioEnum,
  { label: string; descripcion: string; esAdmin: boolean }
> = {
  [TipoUsuarioEnum.ADMIN_GESTORIA]: {
    label: "Administrador de Gestoría",
    descripcion: "Control global multiempresa y supervisión de asesoría.",
    esAdmin: true,
  },
  [TipoUsuarioEnum.ADMIN_EMPRESA]: {
    label: "Administrador de Empresa",
    descripcion: "Gestión total de los parámetros y centros de la empresa.",
    esAdmin: true,
  },
  [TipoUsuarioEnum.RRHH]: {
    label: "Recursos Humanos",
    descripcion: "Gestión de turnos, calendarios, incidencias y personal.",
    esAdmin: true,
  },
  [TipoUsuarioEnum.REPRESENTANTE_LEGAL]: {
    label: "Representante Legal",
    descripcion: "Acceso a informes de cumplimiento y auditoría legal.",
    esAdmin: false,
  },
  [TipoUsuarioEnum.TRABAJADOR]: {
    label: "Trabajador",
    descripcion: "Realización de fichajes y consulta de cuadrante personal.",
    esAdmin: false,
  },
  [TipoUsuarioEnum.AUDITOR_ITSS]: {
    label: "Auditor ITSS",
    descripcion: "Acceso de inspección de trabajo a registros de jornada.",
    esAdmin: false,
  },
};
