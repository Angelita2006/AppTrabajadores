import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import { Empresa } from "../../empresas/types/empresa";
import {
  obtenerAsignacionesTurnoTrabajador,
  obtenerCentroTrabajo,
  obtenerContratosTrabajador,
  obtenerTrabajador,
} from "../api/services";
import { Trabajador, UsuarioSesion } from "../types/trabajador";

interface ContratoLaboral {
  id: string;
  trabajador_id: string;
  empresa_id: string;
  centro_trabajo_id: string;
  departamento_id: string | null;
  tipo_contrato: string;
  tipo_jornada: string;
  horas_semana: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  puesto_trabajo: string | null;
  categoria_profesional: string | null;
  activo: boolean;
}

interface AsignacionTurno {
  id: string;
  empresa_id: string;
  trabajador_id: string;
  turno_id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  turno?: {
    id: string;
    nombre: string;
    hora_inicio: string;
    hora_fin: string;
    minutos_pausa_obligatoria: number;
    color_hex: string;
  } | null;
}

interface SesionContextValue {
  // 1. IDENTIDAD Y CONTROL DE ACCESO
  usuarioActual: UsuarioSesion | null;
  setUsuarioActual: (usuario: UsuarioSesion | null) => void;
  empresas: Empresa[];
  setEmpresas: (empresas: Empresa[]) => void;
  empresaSeleccionada: Empresa | null;
  setEmpresaSeleccionada: (empresa: Empresa | null) => void;
  seleccionarEmpresa: (empresa: Empresa | null) => void;

  // 2. EXPEDIENTE LABORAL COMPUESTO Y SELECCIÓN DE ENTORNO
  trabajadorActual: Trabajador | null;
  contratoActual: ContratoLaboral | null;
  turnoActual: AsignacionTurno | null;
  centroTrabajoActual: CentroTrabajo | null;
  setCentroTrabajoActual: (centro: CentroTrabajo | null) => void; // <--- MODIFICADO: Ahora es seteable externamente

  // 3. PROPIEDADES DIRECTAS CALCULADAS
  centroTrabajoId: string | null;
  departamentoId: string | null;
  rolUsuario: string | null;

  // 4. CONTROL DE ASINCRONÍA
  cargandoSesionLocal: boolean;
}

const SesionContext = createContext<SesionContextValue | undefined>(undefined);

const STORAGE_KEY_USUARIO = "@fichapp_usuario_sesion";
const STORAGE_KEY_EMPRESAS = "@fichapp_empresas_lista";
const STORAGE_KEY_SELECCIONADA = "@fichapp_empresa_seleccionada";
const STORAGE_KEY_CENTRO_SELECCIONADO = "@fichapp_centro_seleccionado"; // <--- NUEVA LLAVE

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioSesion | null>(
    null,
  );
  const [empresaSeleccionada, setEmpresaSeleccionada] =
    useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [trabajadorActual, setTrabajadorActual] = useState<Trabajador | null>(
    null,
  );
  const [contratoActual, setContratoActual] = useState<ContratoLaboral | null>(
    null,
  );
  const [turnoActual, setTurnoActual] = useState<AsignacionTurno | null>(null);
  const [centroTrabajoActual, setCentroTrabajoActual] =
    useState<CentroTrabajo | null>(null);

  const [cargandoSesionLocal, setCargandoSesionLocal] = useState<boolean>(true);

  // ====================================================================
  // MOTOR 1: RESTAURACIÓN EN FRÍO (AsyncStorage)
  // ====================================================================
  useEffect(() => {
    async function recuperarSesionPermanente() {
      try {
        const usuarioGuardado = await AsyncStorage.getItem(STORAGE_KEY_USUARIO);
        const empresasGuardadas =
          await AsyncStorage.getItem(STORAGE_KEY_EMPRESAS);
        const seleccionadaGuardada = await AsyncStorage.getItem(
          STORAGE_KEY_SELECCIONADA,
        );
        const centroGuardado = await AsyncStorage.getItem(
          STORAGE_KEY_CENTRO_SELECCIONADO,
        );

        if (usuarioGuardado) setUsuarioActual(JSON.parse(usuarioGuardado));
        if (empresasGuardadas) setEmpresas(JSON.parse(empresasGuardadas));
        if (seleccionadaGuardada)
          setEmpresaSeleccionada(JSON.parse(seleccionadaGuardada));
        if (centroGuardado) setCentroTrabajoActual(JSON.parse(centroGuardado));
      } catch (error) {
        console.error(
          "Error al restaurar los ficheros locales de sesión:",
          error,
        );
      } finally {
        setCargandoSesionLocal(false);
      }
    }
    recuperarSesionPermanente();
  }, []);

  // ====================================================================
  // MOTOR 2: RESOLUCIÓN EN CASCADA
  // ====================================================================
  useEffect(() => {
    if (cargandoSesionLocal) return;

    async function cargarFichaLaboralCompuesta() {
      if (!usuarioActual?.trabajador_id || !empresaSeleccionada?.id) {
        setTrabajadorActual(null);
        setContratoActual(null);
        setTurnoActual(null);
        setCentroTrabajoActual(null);
        return;
      }

      try {
        const [datosTrabajador, listaContratos, listaTurnos] =
          await Promise.all([
            obtenerTrabajador(usuarioActual.trabajador_id),
            obtenerContratosTrabajador(usuarioActual.trabajador_id),
            obtenerAsignacionesTurnoTrabajador(usuarioActual.trabajador_id),
          ]);

        setTrabajadorActual(datosTrabajador);

        const contratoVigente = listaContratos.find(
          (c: ContratoLaboral) =>
            c.activo === true && c.empresa_id === empresaSeleccionada.id,
        );
        setContratoActual(contratoVigente ?? null);

        // MODIFICADO: Solo autoselecciona el centro del contrato si no hay uno ya fijado/guardado para esta empresa
        if (contratoVigente?.centro_trabajo_id) {
          if (
            !centroTrabajoActual ||
            centroTrabajoActual.empresa_id !== empresaSeleccionada.id
          ) {
            try {
              const datosCentro = await obtenerCentroTrabajo(
                contratoVigente.centro_trabajo_id,
              );
              setCentroTrabajoActual(datosCentro);
            } catch (errCentro) {
              console.error(
                "Error al resolver el objeto Centro de Trabajo:",
                errCentro,
              );
              setCentroTrabajoActual(null);
            }
          }
        } else if (!centroTrabajoActual) {
          setCentroTrabajoActual(null);
        }

        const hoyStr = new Date().toISOString().split("T")[0];
        const turnoVigente = listaTurnos.find((t: AsignacionTurno) => {
          const coincideFiltro = t.empresa_id === empresaSeleccionada.id;
          const esPosteriorInicio = t.fecha_inicio <= hoyStr;
          const esAnteriorFin = !t.fecha_fin || t.fecha_fin >= hoyStr;
          return coincideFiltro && esPosteriorInicio && esAnteriorFin;
        });
        setTurnoActual(turnoVigente ?? null);
      } catch (error) {
        console.error(
          "Error en la sincronización en cascada de PostgreSQL:",
          error,
        );
        setTrabajadorActual(null);
        setContratoActual(null);
        setTurnoActual(null);
        setCentroTrabajoActual(null);
      }
    }

    cargarFichaLaboralCompuesta();
  }, [usuarioActual, empresaSeleccionada, cargandoSesionLocal]);

  // ====================================================================
  // MOTOR 3: PERSISTENCIA ACTIVA DE ESCRITURA EN DISCO
  // ====================================================================
  useEffect(() => {
    async function guardarEstadosEnDisco() {
      try {
        if (usuarioActual) {
          await AsyncStorage.setItem(
            STORAGE_KEY_USUARIO,
            JSON.stringify(usuarioActual),
          );
          await AsyncStorage.setItem(
            STORAGE_KEY_EMPRESAS,
            JSON.stringify(empresas),
          );

          if (empresaSeleccionada) {
            await AsyncStorage.setItem(
              STORAGE_KEY_SELECCIONADA,
              JSON.stringify(empresaSeleccionada),
            );
          }
          if (centroTrabajoActual) {
            await AsyncStorage.setItem(
              STORAGE_KEY_CENTRO_SELECCIONADO,
              JSON.stringify(centroTrabajoActual),
            );
          } else {
            await AsyncStorage.removeItem(STORAGE_KEY_CENTRO_SELECCIONADO);
          }
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY_USUARIO);
          await AsyncStorage.removeItem(STORAGE_KEY_EMPRESAS);
          await AsyncStorage.removeItem(STORAGE_KEY_SELECCIONADA);
          await AsyncStorage.removeItem(STORAGE_KEY_CENTRO_SELECCIONADO);
        }
      } catch (error) {
        console.error("Error al persistir cambios de sesión:", error);
      }
    }
    if (!cargandoSesionLocal) {
      guardarEstadosEnDisco();
    }
  }, [
    usuarioActual,
    empresas,
    empresaSeleccionada,
    centroTrabajoActual,
    cargandoSesionLocal,
  ]);

  // ====================================================================
  // PROPIEDADES DIRECTAS CALCULADAS
  // ====================================================================
  const centroTrabajoId = useMemo(
    () => centroTrabajoActual?.id ?? contratoActual?.centro_trabajo_id ?? null,
    [centroTrabajoActual, contratoActual],
  );
  const departamentoId = useMemo(
    () => contratoActual?.departamento_id ?? null,
    [contratoActual],
  );
  const rolUsuario = useMemo(
    () => usuarioActual?.tipo_usuario ?? null,
    [usuarioActual],
  );

  const value = useMemo(
    () => ({
      usuarioActual,
      setUsuarioActual,
      trabajadorActual,
      empresaSeleccionada,
      setEmpresaSeleccionada,
      empresas,
      setEmpresas,
      seleccionarEmpresa: setEmpresaSeleccionada,
      cargandoSesionLocal,
      contratoActual,
      turnoActual,
      centroTrabajoActual,
      setCentroTrabajoActual,
      centroTrabajoId,
      departamentoId,
      rolUsuario,
    }),
    [
      usuarioActual,
      trabajadorActual,
      empresaSeleccionada,
      empresas,
      cargandoSesionLocal,
      contratoActual,
      turnoActual,
      centroTrabajoActual,
      centroTrabajoId,
      departamentoId,
      rolUsuario,
    ],
  );

  return (
    <SesionContext.Provider value={value}>{children}</SesionContext.Provider>
  );
}

export function useSesion() {
  const context = useContext(SesionContext);
  if (!context) {
    throw new Error("useSesion debe usarse dentro de ProveedorSesion");
  }
  return context;
}
