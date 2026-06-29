import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Empresa } from "../../empresas/types/empresa";
import {
  obtenerAsignacionesTurnoTrabajador,
  obtenerContratosTrabajador,
  obtenerTrabajador,
} from "../api/services";
import { Trabajador, UsuarioSesion } from "../types/trabajador";

// Interfaces estrictas basadas en tus modelos físicos de PostgreSQL
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
  usuarioActual: UsuarioSesion | null; // Contiene id_usuario, email, nombre y rol (tipo_usuario)
  setUsuarioActual: (usuario: UsuarioSesion | null) => void;
  empresas: Empresa[]; // Lista de empresas (Tenants) a las que tiene acceso el usuario
  setEmpresas: (empresas: Empresa[]) => void;
  empresaSeleccionada: Empresa | null; // Empresa activa en la pestaña superior
  setEmpresaSeleccionada: (empresa: Empresa | null) => void;
  seleccionarEmpresa: (empresa: Empresa | null) => void;

  // 2. EXPEDIENTE LABORAL COMPUESTO (Resuelto de forma síncrona en cascada)
  trabajadorActual: Trabajador | null; // Ficha básica de RRHH (NIF, teléfono, SS)
  contratoActual: ContratoLaboral | null; // Condiciones contractuales activas
  turnoActual: AsignacionTurno | null; // Turno/Cuadrante asignado vigente

  // 3. PROPIEDADES DIRECTAS CALCULADAS DE ALTA COMODIDAD PARA LA UI
  centroTrabajoId: string | null; // Extraído automáticamente del contrato activo
  departamentoId: string | null; // Extraído automáticamente del contrato activo
  rolUsuario: string | null; // Atributo directo del rol del sistema (admin_empresa, trabajador, etc.)

  // 4. CONTROL DE ASINCRONÍA Y FEEDBACK
  cargandoSesionLocal: boolean; // TRUE mientras lee AsyncStorage o consulta la cascada de la API
}

const SesionContext = createContext<SesionContextValue | undefined>(undefined);

const STORAGE_KEY_USUARIO = "@fichapp_usuario_sesion";
const STORAGE_KEY_EMPRESAS = "@fichapp_empresas_lista";
const STORAGE_KEY_SELECCIONADA = "@fichapp_empresa_seleccionada";

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

        if (usuarioGuardado) setUsuarioActual(JSON.parse(usuarioGuardado));
        if (empresasGuardadas) setEmpresas(JSON.parse(empresasGuardadas));
        if (seleccionadaGuardada)
          setEmpresaSeleccionada(JSON.parse(seleccionadaGuardada));
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
  // MOTOR 2: RESOLUCIÓN EN CASCADA DE LA HOJA DE SERVICIOS
  // ====================================================================
  useEffect(() => {
    if (cargandoSesionLocal) return;

    async function cargarFichaLaboralCompuesta() {
      if (!usuarioActual?.trabajador_id || !empresaSeleccionada?.id) {
        setTrabajadorActual(null);
        setContratoActual(null);
        setTurnoActual(null);
        return;
      }

      try {
        // Ejecución en paralelo para maximizar la velocidad de respuesta de la red
        const [datosTrabajador, listaContratos, listaTurnos] =
          await Promise.all([
            obtenerTrabajador(usuarioActual.trabajador_id),
            obtenerContratosTrabajador(usuarioActual.trabajador_id),
            obtenerAsignacionesTurnoTrabajador(usuarioActual.trabajador_id),
          ]);

        // Sincronizamos la ficha básica de RRHH
        setTrabajadorActual(datosTrabajador);

        // Filtramos el contrato activo correspondiente a la empresa seleccionada
        const contratoVigente = listaContratos.find(
          (c: ContratoLaboral) =>
            c.activo === true && c.empresa_id === empresaSeleccionada.id,
        );
        setContratoActual(contratoVigente ?? null);

        // Filtramos la asignación de turno vigente para el día de hoy
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
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY_USUARIO);
          await AsyncStorage.removeItem(STORAGE_KEY_EMPRESAS);
          await AsyncStorage.removeItem(STORAGE_KEY_SELECCIONADA);
        }
      } catch (error) {
        console.error("Error al persistir cambios de sesión:", error);
      }
    }
    if (!cargandoSesionLocal) {
      guardarEstadosEnDisco();
    }
  }, [usuarioActual, empresas, empresaSeleccionada, cargandoSesionLocal]);

  // ====================================================================
  // PROPIEDADES DIRECTAS CALCULADAS (MEMORIZADAS)
  // ====================================================================
  const centroTrabajoId = useMemo(
    () => contratoActual?.centro_trabajo_id ?? null,
    [contratoActual],
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
