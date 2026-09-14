import { mostrarError } from "@/src/utils/errorHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { obtenerAsignacionesTurnoTrabajador } from "../../asignaciones-turno/api/services";
import { AsignacionTurno } from "../../asignaciones-turno/types/asignacion-turno";
import { CalendarioFestivo } from "../../calendarios-laborales/types/calendario";
import { obtenerCentroTrabajo } from "../../centros-trabajo/api/services";
import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import { obtenerContratosPorTrabajador } from "../../contratos/api/services";
import { Contrato } from "../../contratos/types/contrato";
import { Dispositivo } from "../../dispositivos-fichaje/types/dispositivo-fichaje";
import { obtenerEmpresa, obtenerEmpresas } from "../../empresas/api/services";
import { Empresa } from "../../empresas/types/empresa";
import {
  obtenerEmpresaTrabajador,
  obtenerTrabajador,
} from "../../trabajadores/api/services";
import { Trabajador } from "../../trabajadores/types/trabajador";
import { TipoUsuarioEnum, UsuarioSesion } from "../../usuarios/types/usuario";

/**
 * Estructura de valores expuestos por el contexto de sesión de la aplicación.
 */
interface SesionContextValue {
  /** 1. IDENTIDAD Y CONTROL DE ACCESO */
  usuarioActual: UsuarioSesion | null;
  setUsuarioActual: (usuario: UsuarioSesion | null) => void;
  empresaActual: Empresa | null;
  setEmpresaActual: (empresa: Empresa | null) => void;

  /** 2. EXPEDIENTE LABORAL COMPUESTO Y SELECCIÓN DE ENTORNO */
  trabajadorActual: Trabajador | null;
  setTrabajadorActual: (trabajador: Trabajador | null) => void;
  contratoActual: Contrato | null;
  setContratoActual: (contrato: Contrato | null) => void;
  turnoActual: AsignacionTurno | null;
  setTurnoActual: (turno: AsignacionTurno | null) => void;
  centroTrabajoActual: CentroTrabajo | null;
  setCentroTrabajoActual: (centro: CentroTrabajo | null) => void;
  calendarioLaboralActual: CalendarioFestivo | null;
  setCalendarioLaboralActual: (calendario: CalendarioFestivo | null) => void;
  dispositivoFichajeActual: Dispositivo | null;
  setDispositivoFichajeActual: (dispositivo: Dispositivo | null) => void;
  rolActual: TipoUsuarioEnum | null;
  setRolActual: (rol: TipoUsuarioEnum | null) => void;
  departamentoActual: string | null;
  setDepartamentoActual: (departamento: string | null) => void;

  /** 3. CONTROL DE ASINCRONÍA */
  cargandoSesionLocal: boolean;
}

const SesionContext = createContext<SesionContextValue | undefined>(undefined);

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

/**
 * Proveedor global de sesión encargado de gestionar el estado de autenticación,
 * persistencia local en AsyncStorage y carga de expediente laboral del usuario.
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioSesion | null>(
    null,
  );
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaActual, setEmpresaActual] = useState<Empresa | null>(null);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [trabajadorActual, setTrabajadorActual] = useState<Trabajador | null>(
    null,
  );
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [contratoActual, setContratoActual] = useState<Contrato | null>(null);
  const [turnos, setTurnos] = useState<AsignacionTurno[]>([]);
  const [turnoActual, setTurnoActual] = useState<AsignacionTurno | null>(null);
  const [centrosTrabajo, setCentrosTrabajo] = useState<CentroTrabajo[]>([]);
  const [centroTrabajoActual, setCentroTrabajoActual] =
    useState<CentroTrabajo | null>(null);
  const [calendarios, setCalendarios] = useState<CalendarioFestivo[]>([]);
  const [calendarioLaboralActual, setCalendarioLaboralActual] =
    useState<CalendarioFestivo | null>(null);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [dispositivoFichajeActual, setDispositivoFichajeActual] =
    useState<Dispositivo | null>(null);
  const [roles, setRoles] = useState<TipoUsuarioEnum[]>([]);
  const [rolActual, setRolActual] = useState<TipoUsuarioEnum | null>(null);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [departamentoActual, setDepartamentoActual] = useState<string | null>(
    null,
  );

  const [cargandoSesionLocal, setCargandoSesionLocal] = useState<boolean>(true);

  // MOTOR 1: RESTAURACIÓN EN FRÍO
  useEffect(() => {
    async function recuperarSesionPermanente() {
      try {
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

        if (usuarioGuardado) setUsuarioActual(JSON.parse(usuarioGuardado));
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
        mostrarError(
          "Error al recuperar la sesión permanente: " + error.message,
        );
      } finally {
        setCargandoSesionLocal(false);
      }
    }
    recuperarSesionPermanente();
  }, []);

  // MOTOR 2: RESOLUCIÓN DE EMPRESAS (Con control de Condiciones de Carrera)
  useEffect(() => {
    if (cargandoSesionLocal) return;

    let isCancelled = false;

    async function inicializarEntornoUsuario() {
      if (!usuarioActual) {
        if (isCancelled) return;
        setEmpresas([]);
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
        if (
          usuarioActual.tipo_usuario === "Admin_empresa" &&
          usuarioActual.empresa_id
        ) {
          const empresa = await obtenerEmpresa(usuarioActual.empresa_id);
          if (isCancelled) return;
          setEmpresas([empresa]);
          setEmpresaActual(empresa);
          return;
        }

        if (usuarioActual.tipo_usuario === "Admin_gestoría") {
          const todasLasEmpresas = await obtenerEmpresas();
          if (isCancelled) return;
          setEmpresas(todasLasEmpresas);
          setEmpresaActual(
            (prev) =>
              prev ??
              (todasLasEmpresas.length > 0 ? todasLasEmpresas[0] : null),
          );
          return;
        }

        if (usuarioActual.trabajador_id) {
          const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
          if (isCancelled) return;

          try {
            const [empresas, empresaTrabajador] = await Promise.all([
              obtenerEmpresas(),
              obtenerEmpresaTrabajador(usuarioActual.trabajador_id, token!),
            ]);

            if (isCancelled) return;

            setEmpresas(empresas);
            // Forzamos la asignación directa de la empresa del trabajador para corregir el estado "Sin Asignar"
            if (empresaTrabajador) {
              setEmpresaActual(empresaTrabajador);
            }
          } catch (err) {
            console.error("Error al obtener la empresa del trabajador:", err);
          }
          return;
        }
      } catch (error: any) {
        if (!isCancelled) {
          mostrarError(
            "Error al inicializar el entorno del usuario: " + error.message,
          );
        }
      }
    }

    inicializarEntornoUsuario();

    return () => {
      isCancelled = true;
    };
  }, [usuarioActual, cargandoSesionLocal]);

  // MOTOR 3: CARGA DE EXPEDIENTE LABORAL (Con control de Condiciones de Carrera y optimización de promesas)
  useEffect(() => {
    if (cargandoSesionLocal) return;

    let isCancelled = false;

    async function cargarFichaLaboralCompuesta() {
      if (!usuarioActual?.trabajador_id || !empresaActual?.id) {
        if (!usuarioActual?.trabajador_id) {
          setTrabajadorActual(null);
          setContratoActual(null);
          setTurnoActual(null);
          setCentroTrabajoActual(null);
        }
        return;
      }

      try {
        const [datosTrabajador, listaContratos, listaTurnos] =
          await Promise.all([
            obtenerTrabajador(usuarioActual.trabajador_id),
            obtenerContratosPorTrabajador(usuarioActual.trabajador_id),
            obtenerAsignacionesTurnoTrabajador(usuarioActual.trabajador_id),
          ]);

        if (isCancelled) return;

        setTrabajadorActual(datosTrabajador);

        const contratoVigente = listaContratos.find(
          (c: Contrato) =>
            c.activo === true && c.empresa_id === empresaActual.id,
        );
        setContratoActual(contratoVigente ?? null);

        if (contratoVigente?.centro_trabajo_id) {
          try {
            const datosCentro = await obtenerCentroTrabajo(
              contratoVigente.centro_trabajo_id,
            );
            if (!isCancelled) setCentroTrabajoActual(datosCentro);
          } catch (errCentro) {
            if (!isCancelled) {
              mostrarError(
                "Error al cargar el centro de trabajo: " + errCentro,
              );
              setCentroTrabajoActual(null);
            }
          }
        } else {
          setCentroTrabajoActual(null);
        }

        const hoyStr = new Date().toISOString().split("T")[0];

        const turnosConEmpresa = await Promise.all(
          listaTurnos.map(async (t: AsignacionTurno) => {
            const trabajadorTurno = await obtenerTrabajador(t.trabajador_id);
            return {
              turno: t,
              empresaId: trabajadorTurno.empresa_id,
            };
          }),
        );

        if (isCancelled) return;

        const turnoVigenteObj = turnosConEmpresa.find(
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
          mostrarError("Error al cargar la ficha laboral: " + error.message);
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
  }, [usuarioActual?.trabajador_id, empresaActual?.id, cargandoSesionLocal]);

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
        mostrarError("Error al persistir cambios de sesión: " + error.message);
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

  const value = useMemo(
    () => ({
      usuarioActual,
      setUsuarioActual,
      empresaActual,
      setEmpresaActual,
      trabajadorActual,
      setTrabajadorActual,
      contratoActual,
      setContratoActual,
      turnoActual,
      setTurnoActual,
      centroTrabajoActual,
      setCentroTrabajoActual,
      calendarioLaboralActual,
      setCalendarioLaboralActual,
      dispositivoFichajeActual,
      setDispositivoFichajeActual,
      rolActual,
      setRolActual,
      departamentoActual,
      setDepartamentoActual,
      cargandoSesionLocal,
    }),
    [
      usuarioActual,
      setUsuarioActual,
      empresaActual,
      setEmpresaActual,
      trabajadorActual,
      setTrabajadorActual,
      contratoActual,
      setContratoActual,
      turnoActual,
      setTurnoActual,
      centroTrabajoActual,
      setCentroTrabajoActual,
      calendarioLaboralActual,
      setCalendarioLaboralActual,
      dispositivoFichajeActual,
      setDispositivoFichajeActual,
      rolActual,
      setRolActual,
      departamentoActual,
      setDepartamentoActual,
      cargandoSesionLocal,
    ],
  );

  return (
    <SesionContext.Provider value={value}>{children}</SesionContext.Provider>
  );
}

/**
 * Hook para consumir el contexto de sesión de la aplicación.
 *
 * @returns Objeto con los datos y métodos del contexto de sesión (`SesionContextValue`).
 * @throws Error si se intenta invocar fuera de un `ProveedorSesion`.
 */
export function useSesion() {
  const context = useContext(SesionContext);
  if (!context) {
    throw new Error("useSesion debe usarse dentro de ProveedorSesion");
  }
  return context;
}
