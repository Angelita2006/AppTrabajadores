import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReactNode, useEffect } from "react";
import { create } from "zustand";
import { setAuthToken, setEmpresaContext } from "@/src/service/api/api";
import { obtenerMisAccesos } from "../api/services";
import { obtenerAsignacionesTurnoTrabajador } from "../../asignaciones-turno/api/services";
import { AsignacionTurno } from "../../asignaciones-turno/types/asignacion-turno";
import { CalendarioFestivo } from "../../calendarios-laborales/types/calendario";
import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import { obtenerContratosPorTrabajador } from "../../contratos/api/services";
import { Contrato } from "../../contratos/types/contrato";
import { Dispositivo } from "../../dispositivos-fichaje/types/dispositivo-fichaje";
import { obtenerEmpresa, obtenerEmpresas } from "../../empresas/api/services";
import { Empresa } from "../../empresas/types/empresa";
import { obtenerMiTrabajador, obtenerTrabajador } from "../../trabajadores/api/services";
import { Trabajador } from "../../trabajadores/types/trabajador";
import { TipoRolEnum } from "@/src/constants/enums";
import { TipoUsuarioEnum, UsuarioSesion } from "../../usuarios/types/usuario";

const STORAGE_KEY_VERSION = "@fichapp_cache_version";
const CURRENT_VERSION = "2.0";

const STORAGE_KEY_USUARIO = "@fichapp_usuario_sesion";
const STORAGE_KEY_EMPRESA = "@fichapp_empresa_actual";
const STORAGE_KEY_CENTRO = "@fichapp_centro_actual";
const STORAGE_KEY_CONTRATO = "@fichapp_contrato_actual";
const STORAGE_KEY_TURNO = "@fichapp_turno_actual";
const STORAGE_KEY_CALENDARIO = "@fichapp_calendario_actual";
const STORAGE_KEY_DISPOSITIVO = "@fichapp_dispositivo_actual";
const STORAGE_KEY_ROL = "@fichapp_rol_actual";
const STORAGE_KEY_DEPARTAMENTO = "@fichapp_departamento_actual";
const STORAGE_KEY_TOKEN = "user_token";

interface SesionState {
  usuarioActual: UsuarioSesion | null;
  setUsuarioActual: (usuario: UsuarioSesion | null) => void;
  empresas: Empresa[];
  setEmpresas: (empresas: Empresa[]) => void;
  accesos: import("../api/services").AccesoUsuario[];
  setAccesos: (accesos: import("../api/services").AccesoUsuario[]) => void;
  tienePermiso: (recurso: string, accion: string, alcance?: string) => boolean;
  empresaActual: Empresa | null;
  setEmpresaActual: (empresa: Empresa | null) => void;
  trabajadores: Trabajador[];
  setTrabajadores: (trabajadores: Trabajador[]) => void;
  trabajadorActual: Trabajador | null;
  setTrabajadorActual: (trabajador: Trabajador | null) => void;
  contratos: Contrato[];
  setContratos: (contratos: Contrato[]) => void;
  contratoActual: Contrato | null;
  setContratoActual: (contrato: Contrato | null) => void;
  turnos: AsignacionTurno[];
  setTurnos: (turnos: AsignacionTurno[]) => void;
  turnoActual: AsignacionTurno | null;
  setTurnoActual: (turno: AsignacionTurno | null) => void;
  centrosTrabajo: CentroTrabajo[];
  setCentrosTrabajo: (centros: CentroTrabajo[]) => void;
  centroTrabajoActual: CentroTrabajo | null;
  setCentroTrabajoActual: (centro: CentroTrabajo | null) => void;
  calendarios: CalendarioFestivo[];
  setCalendarios: (calendarios: CalendarioFestivo[]) => void;
  calendarioLaboralActual: CalendarioFestivo | null;
  setCalendarioLaboralActual: (calendario: CalendarioFestivo | null) => void;
  dispositivos: Dispositivo[];
  setDispositivos: (dispositivos: Dispositivo[]) => void;
  dispositivoFichajeActual: Dispositivo | null;
  setDispositivoFichajeActual: (dispositivo: Dispositivo | null) => void;
  roles: TipoUsuarioEnum[];
  setRoles: (roles: TipoUsuarioEnum[]) => void;
  rolActual: TipoUsuarioEnum | null;
  setRolActual: (rol: TipoUsuarioEnum | null) => void;
  departamentos: string[];
  setDepartamentos: (departamentos: string[]) => void;
  departamentoActual: string | null;
  setDepartamentoActual: (departamento: string | null) => void;
  cargandoSesionLocal: boolean;
  setCargandoSesionLocal: (cargando: boolean) => void;
  actualizarUsuarioSesion: (
    nuevoUsuario: UsuarioSesion | null,
  ) => Promise<void>;
  cerrarSesionCompleta: () => Promise<void>;
  limpiarContextoOrganizacion: () => void;
}

export const useSesionStore = create<SesionState>((set, get) => ({
  usuarioActual: null,
  setUsuarioActual: (usuarioActual) => set({ usuarioActual }),
  empresas: [],
  setEmpresas: (empresas) => set({ empresas }),
  accesos: [],
  setAccesos: (accesos) => set({ accesos }),
  tienePermiso: (recurso, accion, alcance) => {
    const estado = get();
    // 1. Superadministrador global: bypass total de permisos en todos los alcances
    const esSuperadmin =
      estado.rolActual === TipoRolEnum.SUPERADMINISTRADOR ||
      estado.usuarioActual?.tipo_usuario === TipoRolEnum.SUPERADMINISTRADOR ||
      estado.accesos.some(
        (acceso) =>
          acceso.empresa_id === null &&
          acceso.rol.tipo === TipoRolEnum.SUPERADMINISTRADOR,
      );
    if (esSuperadmin) {
      return true;
    }

    // 2. Permisos globales estrictamente reservados a membresía de superadministrador
    if (alcance === "global") {
      return false;
    }

    const empresaActivaId =
      estado.empresaActual?.id ?? estado.usuarioActual?.empresa_id ?? null;

    // 3. Filtrar membresías activas correspondientes al tenant seleccionado
    const accesosAplicables = estado.accesos.filter(
      (acceso) =>
        acceso.empresa_id === empresaActivaId ||
        (empresaActivaId === null && acceso.empresa_id !== null),
    );

    return accesosAplicables.some((acceso) =>
      acceso.permisos.some((permiso) => {
        if (permiso.recurso !== recurso || permiso.accion !== accion) {
          return false;
        }
        if (!alcance) {
          return true;
        }
        // Jerarquía de alcances del backend (_permiso_satisfecho):
        // 'propio' se satisface con 'propio' o 'empresa' o 'global'
        if (alcance === "propio") {
          return (
            permiso.alcance === "propio" ||
            permiso.alcance === "empresa" ||
            permiso.alcance === "global"
          );
        }
        // 'empresa' se satisface con 'empresa' o 'global'
        if (alcance === "empresa") {
          return permiso.alcance === "empresa" || permiso.alcance === "global";
        }
        return permiso.alcance === alcance;
      }),
    );
  },
  empresaActual: null,
  setEmpresaActual: (empresaActual) => {
    const empresaAnterior = get().empresaActual;
    if (empresaAnterior?.id !== empresaActual?.id) {
      set({
        empresaActual,
        trabajadores: [],
        trabajadorActual: null,
        contratos: [],
        contratoActual: null,
        turnos: [],
        turnoActual: null,
        centrosTrabajo: [],
        centroTrabajoActual: null,
        calendarios: [],
        calendarioLaboralActual: null,
        dispositivos: [],
        dispositivoFichajeActual: null,
      });
    } else {
      set({ empresaActual });
    }
    void setEmpresaContext(empresaActual?.id ?? null);
  },
  trabajadores: [],
  setTrabajadores: (trabajadores) => set({ trabajadores }),
  trabajadorActual: null,
  setTrabajadorActual: (trabajadorActual) => set({ trabajadorActual }),
  contratos: [],
  setContratos: (contratos) => set({ contratos }),
  contratoActual: null,
  setContratoActual: (contratoActual) => set({ contratoActual }),
  turnos: [],
  setTurnos: (turnos) => set({ turnos }),
  turnoActual: null,
  setTurnoActual: (turnoActual) => set({ turnoActual }),
  centrosTrabajo: [],
  setCentrosTrabajo: (centrosTrabajo) => set({ centrosTrabajo }),
  centroTrabajoActual: null,
  setCentroTrabajoActual: (centroTrabajoActual) => set({ centroTrabajoActual }),
  calendarios: [],
  setCalendarios: (calendarios) => set({ calendarios }),
  calendarioLaboralActual: null,
  setCalendarioLaboralActual: (calendarioLaboralActual) =>
    set({ calendarioLaboralActual }),
  dispositivos: [],
  setDispositivos: (dispositivos) => set({ dispositivos }),
  dispositivoFichajeActual: null,
  setDispositivoFichajeActual: (dispositivoFichajeActual) =>
    set({ dispositivoFichajeActual }),
  roles: [],
  setRoles: (roles) => set({ roles }),
  rolActual: null,
  setRolActual: (rolActual) => set({ rolActual }),
  departamentos: [],
  setDepartamentos: (departamentos) => set({ departamentos }),
  departamentoActual: null,
  setDepartamentoActual: (departamentoActual) => set({ departamentoActual }),
  cargandoSesionLocal: true,
  setCargandoSesionLocal: (cargandoSesionLocal) => set({ cargandoSesionLocal }),

  // Implementación del método seguro para refrescar datos de usuario sin caché viejo
  actualizarUsuarioSesion: async (nuevoUsuario) => {
    try {
      if (nuevoUsuario) {
        await AsyncStorage.setItem(
          STORAGE_KEY_USUARIO,
          JSON.stringify(nuevoUsuario),
        );
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY_USUARIO);
      }
      set({ usuarioActual: nuevoUsuario });
    } catch (error: any) {
      console.error(
        "Error al actualizar la sesión del usuario: " +
          obtenerMensajeAmigableError(error),
      );
    }
  },

  // Cierre de sesión completo que limpia almacenamiento y fuerza redirección
  cerrarSesionCompleta: async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEY_USUARIO,
        STORAGE_KEY_EMPRESA,
        STORAGE_KEY_CENTRO,
        STORAGE_KEY_CONTRATO,
        STORAGE_KEY_TURNO,
        STORAGE_KEY_CALENDARIO,
        STORAGE_KEY_DISPOSITIVO,
        STORAGE_KEY_ROL,
        STORAGE_KEY_DEPARTAMENTO,
        STORAGE_KEY_TOKEN,
        STORAGE_KEY_VERSION,
      ]);
      await setEmpresaContext(null);
      await setAuthToken(null);

      set({
        usuarioActual: null,
        empresas: [],
        accesos: [],
        empresaActual: null,
        trabajadores: [],
        trabajadorActual: null,
        contratos: [],
        contratoActual: null,
        turnos: [],
        turnoActual: null,
        centrosTrabajo: [],
        centroTrabajoActual: null,
        calendarios: [],
        calendarioLaboralActual: null,
        dispositivos: [],
        dispositivoFichajeActual: null,
        roles: [],
        rolActual: null,
        departamentos: [],
        departamentoActual: null,
      });
    } catch (error: any) {
      console.error(
        "Error al cerrar la sesión: " + obtenerMensajeAmigableError(error),
      );
    }
  },

  limpiarContextoOrganizacion: () => {
    void setEmpresaContext(null);
    set({
      empresas: [],
      accesos: [],
      empresaActual: null,
      trabajadores: [],
      trabajadorActual: null,
      contratos: [],
      contratoActual: null,
      turnos: [],
      turnoActual: null,
      centrosTrabajo: [],
      centroTrabajoActual: null,
      calendarios: [],
      calendarioLaboralActual: null,
      dispositivos: [],
      dispositivoFichajeActual: null,
      roles: [],
      rolActual: null,
      departamentos: [],
      departamentoActual: null,
    });
  },
}));

/**
 * Componente Proveedor que ejecuta los 4 motores de carga y sincronización.
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const {
    usuarioActual,
    setUsuarioActual,
    setEmpresas,
    empresaActual,
    setEmpresaActual,
    setTrabajadores,
    setTrabajadorActual,
    setContratos,
    setContratoActual,
    setTurnos,
    setTurnoActual,
    setCentrosTrabajo,
    setCentroTrabajoActual,
    setRoles,
    setRolActual,
    setDepartamentos,
    setDepartamentoActual,
    setDispositivos,
    setDispositivoFichajeActual,
    setCalendarios,
    setCalendarioLaboralActual,
    cargandoSesionLocal,
    setCargandoSesionLocal,
    trabajadorActual,
    contratoActual,
    turnoActual,
    centroTrabajoActual,
    calendarioLaboralActual,
    dispositivoFichajeActual,
    rolActual,
    departamentoActual,
  } = useSesionStore();

  // MOTOR 1: RESTAURACIÓN EN FRÍO
  useEffect(() => {
    async function recuperarSesionPermanente() {
      try {
        const versionGuardada = await AsyncStorage.getItem(STORAGE_KEY_VERSION);

        if (versionGuardada !== CURRENT_VERSION) {
          await AsyncStorage.multiRemove([
            STORAGE_KEY_USUARIO,
            STORAGE_KEY_EMPRESA,
            STORAGE_KEY_CENTRO,
            STORAGE_KEY_CONTRATO,
            STORAGE_KEY_TURNO,
            STORAGE_KEY_CALENDARIO,
            STORAGE_KEY_DISPOSITIVO,
            STORAGE_KEY_ROL,
            STORAGE_KEY_DEPARTAMENTO,
          ]);
          await AsyncStorage.setItem(STORAGE_KEY_VERSION, CURRENT_VERSION);
          setCargandoSesionLocal(false);
          return;
        }

        const [
          usuarioGuardado,
          empresaGuardada,
          contratoGuardado,
          turnoGuardado,
          centroGuardado,
          calendarioGuardado,
          dispositivoGuardado,
          rolGuardado,
          departamentoGuardado,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_USUARIO),
          AsyncStorage.getItem(STORAGE_KEY_EMPRESA),
          AsyncStorage.getItem(STORAGE_KEY_CONTRATO),
          AsyncStorage.getItem(STORAGE_KEY_TURNO),
          AsyncStorage.getItem(STORAGE_KEY_CENTRO),
          AsyncStorage.getItem(STORAGE_KEY_CALENDARIO),
          AsyncStorage.getItem(STORAGE_KEY_DISPOSITIVO),
          AsyncStorage.getItem(STORAGE_KEY_ROL),
          AsyncStorage.getItem(STORAGE_KEY_DEPARTAMENTO),
        ]);

        if (usuarioGuardado) {
          const parsedUsuario = JSON.parse(usuarioGuardado);
          if (parsedUsuario && (parsedUsuario.id || parsedUsuario.email)) {
            setUsuarioActual(parsedUsuario);
          } else {
            await AsyncStorage.removeItem(STORAGE_KEY_USUARIO);
          }
        }

        if (empresaGuardada) setEmpresaActual(JSON.parse(empresaGuardada));
        if (contratoGuardado) setContratoActual(JSON.parse(contratoGuardado));
        if (turnoGuardado) setTurnoActual(JSON.parse(turnoGuardado));
        if (centroGuardado) setCentroTrabajoActual(JSON.parse(centroGuardado));
        if (calendarioGuardado)
          setCalendarioLaboralActual(JSON.parse(calendarioGuardado));
        if (dispositivoGuardado)
          setDispositivoFichajeActual(JSON.parse(dispositivoGuardado));
        if (rolGuardado) setRolActual(JSON.parse(rolGuardado));
        if (departamentoGuardado)
          setDepartamentoActual(JSON.parse(departamentoGuardado));
      } catch (error: any) {
        console.error(
          "Error al recuperar la sesión permanente: " +
            obtenerMensajeAmigableError(error),
        );
      } finally {
        setCargandoSesionLocal(false);
      }
    }
    recuperarSesionPermanente();
  }, []);

  // MOTOR 2: RESOLUCIÓN DE EMPRESAS
  useEffect(() => {
    if (cargandoSesionLocal) return;
    let isCancelled = false;

    async function inicializarEntornoUsuario() {
      if (!usuarioActual) {
        if (isCancelled) return;
        setEmpresas([]);
        useSesionStore.getState().setAccesos([]);
        setEmpresaActual(null);
        setTrabajadores([]);
        setTrabajadorActual(null);
        setContratos([]);
        setContratoActual(null);
        setTurnos([]);
        setTurnoActual(null);
        setCentrosTrabajo([]);
        setCentroTrabajoActual(null);
        setRoles([]);
        setRolActual(null);
        setDepartamentos([]);
        setDepartamentoActual(null);
        setDispositivos([]);
        setDispositivoFichajeActual(null);
        setCalendarios([]);
        setCalendarioLaboralActual(null);
        return;
      }

      try {
        const empresaGuardada = useSesionStore.getState().empresaActual;
        let accesos = await obtenerMisAccesos(empresaGuardada?.id);
        if (isCancelled) return;
        useSesionStore.getState().setAccesos(accesos);

        // Resuelve primero el rol global: la carga de empresas depende de otra
        // petición y un fallo suyo no debe ocultar la consola al superadmin.
        const accesoGlobal = accesos.find(
          (acceso) =>
            acceso.empresa_id === null &&
            acceso.rol.tipo === "Superadministrador",
        );
        if (accesoGlobal) {
          setRolActual(accesoGlobal.rol.tipo as TipoUsuarioEnum);
          setUsuarioActual({
            ...usuarioActual,
            tipo_usuario: accesoGlobal.rol.tipo as TipoUsuarioEnum,
            empresa_id: null,
          });
        }

        const empresaContextoInicial = empresaGuardada?.id ??
          usuarioActual.empresa_id ??
          accesos.find((acceso) => acceso.empresa_id)?.empresa_id ?? null;
        await setEmpresaContext(empresaContextoInicial);

        let empresasDisponibles: Empresa[];
        try {
          empresasDisponibles = await obtenerEmpresas();
        } catch (error) {
          const empresaRespaldo = accesos.find(
            (acceso) => acceso.empresa_id,
          )?.empresa_id ?? null;
          if (!empresaRespaldo) {
            throw error;
          }
          await setEmpresaContext(empresaRespaldo);
          try {
            empresasDisponibles = await obtenerEmpresas();
          } catch {
            empresasDisponibles = [await obtenerEmpresa(empresaRespaldo)];
          }
        }
        if (empresasDisponibles.length === 0 && empresaContextoInicial) {
          empresasDisponibles = [await obtenerEmpresa(empresaContextoInicial)];
        }
        if (isCancelled) return;
        setEmpresas(empresasDisponibles);
        const empresaSeleccionada = empresasDisponibles.find(
          (empresa) => empresa.id === empresaGuardada?.id,
        ) ?? empresasDisponibles.find(
          (empresa) => empresa.id === empresaContextoInicial,
        ) ?? empresasDisponibles[0] ?? null;
        await setEmpresaContext(empresaSeleccionada?.id ?? null);
        setEmpresaActual(empresaSeleccionada);
        accesos = await obtenerMisAccesos(empresaSeleccionada?.id);
        if (isCancelled) return;
        useSesionStore.getState().setAccesos(accesos);

        const accesoActivo = accesos.find(
          (acceso) => acceso.empresa_id === empresaSeleccionada?.id,
        ) ?? accesos.find((acceso) => acceso.rol.tipo.startsWith("Admin_gestor"))
          ?? accesos.find((acceso) => acceso.empresa_id === null);
        if (accesoActivo) {
          const usuarioActualizado = {
            ...usuarioActual,
            tipo_usuario: accesoActivo.rol.tipo as TipoUsuarioEnum,
            empresa_id: empresaSeleccionada?.id ?? null,
          };
          if (
            usuarioActual.tipo_usuario !== usuarioActualizado.tipo_usuario ||
            usuarioActual.empresa_id !== usuarioActualizado.empresa_id
          ) {
            setUsuarioActual(usuarioActualizado);
          }
          setRolActual(accesoActivo.rol.tipo as TipoUsuarioEnum);
        }

        try {
          const trabajador = await obtenerMiTrabajador();
          if (isCancelled) return;
          setTrabajadorActual(trabajador);
          const usuarioEnStore = useSesionStore.getState().usuarioActual;
          if (usuarioEnStore && usuarioEnStore.trabajador_id !== trabajador.id) {
            setUsuarioActual({ ...usuarioEnStore, trabajador_id: trabajador.id });
          }
        } catch {
          if (!isCancelled) {
            setTrabajadorActual(null);
            const usuarioEnStore = useSesionStore.getState().usuarioActual;
            if (usuarioEnStore?.trabajador_id) {
              setUsuarioActual({ ...usuarioEnStore, trabajador_id: null });
            }
          }
        }
      } catch (error: any) {
        if (!isCancelled) {
          console.error(
            "Error al inicializar el entorno del usuario: " +
              obtenerMensajeAmigableError(error),
          );
        }
      }
    }

    inicializarEntornoUsuario();
    return () => {
      isCancelled = true;
    };
  }, [usuarioActual?.id, empresaActual?.id, cargandoSesionLocal]);

  // MOTOR 3: CARGA DE EXPEDIENTE LABORAL
  useEffect(() => {
    if (cargandoSesionLocal) return;
    let isCancelled = false;

    async function cargarFichaLaboralCompuesta() {
      if (!usuarioActual || !empresaActual?.id) {
        setTrabajadorActual(null);
        setContratoActual(null);
        setTurnoActual(null);
        setCentroTrabajoActual(null);
        return;
      }
      if (!trabajadorActual || trabajadorActual.empresa_id !== empresaActual.id) {
        setContratoActual(null);
        setTurnoActual(null);
        setCentroTrabajoActual(null);
        return;
      }

      try {
        const idTrabajador = trabajadorActual.id;
        const [listaContratos, listaTurnos] =
          await Promise.all([
            obtenerContratosPorTrabajador(idTrabajador),
            obtenerAsignacionesTurnoTrabajador(idTrabajador),
          ]);

        if (isCancelled) return;

        const contratoVigente = listaContratos.find(
          (c: Contrato) =>
            c.activo === true && c.empresa_id === empresaActual.id,
        );
        setContratoActual(contratoVigente ?? null);

        const centrosContrato = contratoVigente?.centros_trabajo ?? [];
        const centroSeleccionado = centrosContrato.find(
          (centro) =>
            centro.id === useSesionStore.getState().centroTrabajoActual?.id,
        );
        if (!isCancelled) {
          setCentroTrabajoActual(centroSeleccionado ?? centrosContrato[0] ?? null);
        }

        const hoyStr = new Date().toISOString().split("T")[0];
        const turnosConEmpresa = await Promise.all(
          listaTurnos.map(async (t: AsignacionTurno) => {
            if (!t.trabajador_id) return null;
            const trabajadorTurno = await obtenerTrabajador(t.trabajador_id);
            return {
              turno: t,
              empresaId: trabajadorTurno.empresa_id,
            };
          }),
        );

        if (isCancelled) return;

        const turnosConEmpresaValidos = turnosConEmpresa.filter((item) => item !== null);
        const turnoVigenteObj = turnosConEmpresaValidos.find(
          ({ turno, empresaId }) => {
            const coincideFiltro = empresaId === empresaActual.id;
            const esPosteriorInicio = turno.fecha_inicio <= hoyStr;
            const esAnteriorFin = !turno.fecha_fin || turno.fecha_fin >= hoyStr;
            return coincideFiltro && esPosteriorInicio && esAnteriorFin;
          },
        );

        setTurnoActual(turnoVigenteObj ? turnoVigenteObj.turno : null);
      } catch (error: any) {
        if (!isCancelled) {
          console.error(
            "Error al cargar la ficha laboral: " +
              obtenerMensajeAmigableError(error),
          );
          setTrabajadorActual(null);
          setContratoActual(null);
          setTurnoActual(null);
        }
      }
    }

    cargarFichaLaboralCompuesta();
    return () => {
      isCancelled = true;
    };
  }, [usuarioActual?.id, trabajadorActual?.id, empresaActual?.id, cargandoSesionLocal]);

  // MOTOR 4: PERSISTENCIA ACTIVA DE ESCRITURA EN DISCO
  useEffect(() => {
    if (cargandoSesionLocal) return;
    async function guardarEstadosEnDisco() {
      try {
        if (usuarioActual) {
          await Promise.all([
            AsyncStorage.setItem(
              STORAGE_KEY_USUARIO,
              JSON.stringify(usuarioActual),
            ),
            empresaActual
              ? AsyncStorage.setItem(
                  STORAGE_KEY_EMPRESA,
                  JSON.stringify(empresaActual),
                )
              : AsyncStorage.removeItem(STORAGE_KEY_EMPRESA),
            centroTrabajoActual
              ? AsyncStorage.setItem(
                  STORAGE_KEY_CENTRO,
                  JSON.stringify(centroTrabajoActual),
                )
              : AsyncStorage.removeItem(STORAGE_KEY_CENTRO),
            contratoActual
              ? AsyncStorage.setItem(
                  STORAGE_KEY_CONTRATO,
                  JSON.stringify(contratoActual),
                )
              : AsyncStorage.removeItem(STORAGE_KEY_CONTRATO),
            turnoActual
              ? AsyncStorage.setItem(
                  STORAGE_KEY_TURNO,
                  JSON.stringify(turnoActual),
                )
              : AsyncStorage.removeItem(STORAGE_KEY_TURNO),
            calendarioLaboralActual
              ? AsyncStorage.setItem(
                  STORAGE_KEY_CALENDARIO,
                  JSON.stringify(calendarioLaboralActual),
                )
              : AsyncStorage.removeItem(STORAGE_KEY_CALENDARIO),
            dispositivoFichajeActual
              ? AsyncStorage.setItem(
                  STORAGE_KEY_DISPOSITIVO,
                  JSON.stringify(dispositivoFichajeActual),
                )
              : AsyncStorage.removeItem(STORAGE_KEY_DISPOSITIVO),
            rolActual
              ? AsyncStorage.setItem(STORAGE_KEY_ROL, JSON.stringify(rolActual))
              : AsyncStorage.removeItem(STORAGE_KEY_ROL),
            departamentoActual
              ? AsyncStorage.setItem(
                  STORAGE_KEY_DEPARTAMENTO,
                  JSON.stringify(departamentoActual),
                )
              : AsyncStorage.removeItem(STORAGE_KEY_DEPARTAMENTO),
          ]);
        } else {
          await Promise.all([
            AsyncStorage.removeItem(STORAGE_KEY_USUARIO),
            AsyncStorage.removeItem(STORAGE_KEY_EMPRESA),
            AsyncStorage.removeItem(STORAGE_KEY_CENTRO),
            AsyncStorage.removeItem(STORAGE_KEY_CONTRATO),
            AsyncStorage.removeItem(STORAGE_KEY_TURNO),
            AsyncStorage.removeItem(STORAGE_KEY_CALENDARIO),
            AsyncStorage.removeItem(STORAGE_KEY_DISPOSITIVO),
            AsyncStorage.removeItem(STORAGE_KEY_ROL),
            AsyncStorage.removeItem(STORAGE_KEY_DEPARTAMENTO),
          ]);
        }
      } catch (error: any) {
        console.error(
          "Error al persistir cambios de sesión: " +
            obtenerMensajeAmigableError(error),
        );
      }
    }
    guardarEstadosEnDisco();
  }, [
    usuarioActual,
    empresaActual,
    trabajadorActual,
    contratoActual,
    turnoActual,
    centroTrabajoActual,
    calendarioLaboralActual,
    dispositivoFichajeActual,
    rolActual,
    departamentoActual,
    cargandoSesionLocal,
  ]);

  return <>{children}</>;
}

/**
 * Hook personalizado para consumir el store de Zustand.
 */
export function useSesion() {
  const store = useSesionStore();
  return store;
}
