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
import { obtenerCentroTrabajo } from "../../centros-trabajo/api/services";
import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import { obtenerContratosTrabajador } from "../../contratos/api/services";
import { Contrato } from "../../contratos/types/contrato";
import { obtenerEmpresa, obtenerEmpresas } from "../../empresas/api/services";
import { Empresa } from "../../empresas/types/empresa";
import {
  obtenerEmpresasTrabajador,
  obtenerTrabajador,
} from "../../trabajadores/api/services";
import { Trabajador } from "../../trabajadores/types/trabajador";
import { TipoUsuarioEnum, UsuarioResponse } from "../../usuarios/types/usuario";

interface SesionContextValue {
  // 1. IDENTIDAD Y CONTROL DE ACCESO
  usuarioActual: UsuarioResponse | null;
  setUsuarioActual: (usuario: UsuarioResponse | null) => void;
  empresas: Empresa[];
  setEmpresas: (empresas: Empresa[]) => void;
  empresaSeleccionada: Empresa | null;
  setEmpresaSeleccionada: (empresa: Empresa | null) => void;
  seleccionarEmpresa: (empresa: Empresa | null) => void;

  // 2. EXPEDIENTE LABORAL COMPUESTO Y SELECCIÓN DE ENTORNO
  trabajadorActual: Trabajador | null;
  contratoActual: Contrato | null;
  turnoActual: AsignacionTurno | null;
  centroTrabajoActual: CentroTrabajo | null;
  setCentroTrabajoActual: (centro: CentroTrabajo | null) => void;

  // 3. PROPIEDADES DIRECTAS CALCULADAS
  centroTrabajoId: string | null;
  departamentoId: string | null;
  rolUsuario: TipoUsuarioEnum | null;

  // 4. CONTROL DE ASINCRONÍA
  cargandoSesionLocal: boolean;
}

const SesionContext = createContext<SesionContextValue | undefined>(undefined);

const STORAGE_KEY_USUARIO = "@fichapp_usuario_sesion";
const STORAGE_KEY_EMPRESAS = "@fichapp_empresas_lista";
const STORAGE_KEY_SELECCIONADA = "@fichapp_empresa_seleccionada";
const STORAGE_KEY_CENTRO_SELECCIONADO = "@fichapp_centro_seleccionado";
const STORAGE_KEY_TOKEN = "user_token";

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioResponse | null>(
    null,
  );
  const [empresaSeleccionada, setEmpresaSeleccionada] =
    useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [trabajadorActual, setTrabajadorActual] = useState<Trabajador | null>(
    null,
  );
  const [contratoActual, setContratoActual] = useState<Contrato | null>(null);
  const [turnoActual, setTurnoActual] = useState<AsignacionTurno | null>(null);
  const [centroTrabajoActual, setCentroTrabajoActual] =
    useState<CentroTrabajo | null>(null);

  const [cargandoSesionLocal, setCargandoSesionLocal] = useState<boolean>(true);

  // ====================================================================
  // MOTOR 1: RESTAURACIÓN EN FRÍO (Con validación de coherencia)
  // ====================================================================
  useEffect(() => {
    async function recuperarSesionPermanente() {
      try {
        const [
          usuarioGuardado,
          empresasGuardadas,
          seleccionadaGuardada,
          centroGuardado,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_USUARIO),
          AsyncStorage.getItem(STORAGE_KEY_EMPRESAS),
          AsyncStorage.getItem(STORAGE_KEY_SELECCIONADA),
          AsyncStorage.getItem(STORAGE_KEY_CENTRO_SELECCIONADO),
        ]);

        if (usuarioGuardado) setUsuarioActual(JSON.parse(usuarioGuardado));
        if (empresasGuardadas) setEmpresas(JSON.parse(empresasGuardadas));

        let empresaParsed: Empresa | null = null;
        if (seleccionadaGuardada) {
          empresaParsed = JSON.parse(seleccionadaGuardada);
          setEmpresaSeleccionada(empresaParsed);
        }

        // Validar que el centro guardado pertenezca realmente a la empresa seleccionada restaurada
        if (centroGuardado && empresaParsed) {
          const centroParsed = JSON.parse(centroGuardado);
          if (centroParsed.empresa_id === empresaParsed.id) {
            setCentroTrabajoActual(centroParsed);
          } else {
            await AsyncStorage.removeItem(STORAGE_KEY_CENTRO_SELECCIONADO);
          }
        }
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
  // MOTOR 2: RESOLUCIÓN DE EMPRESAS (Con control de Race Conditions)
  // ====================================================================
  useEffect(() => {
    if (cargandoSesionLocal) return;

    let isCancelled = false;

    async function inicializarEntornoUsuario() {
      if (!usuarioActual) {
        if (isCancelled) return;
        setEmpresas([]);
        setEmpresaSeleccionada(null);
        setTrabajadorActual(null);
        setContratoActual(null);
        setTurnoActual(null);
        setCentroTrabajoActual(null);
        return;
      }

      try {
        if (
          usuarioActual.tipo_usuario === TipoUsuarioEnum.ADMIN_EMPRESA &&
          usuarioActual.empresa_id
        ) {
          const empresa = await obtenerEmpresa(usuarioActual.empresa_id);
          if (isCancelled) return;
          setEmpresas([empresa]);
          setEmpresaSeleccionada(empresa);
          return;
        }

        if (usuarioActual.tipo_usuario === TipoUsuarioEnum.ADMIN_GESTORIA) {
          const todasLasEmpresas = await obtenerEmpresas();
          if (isCancelled) return;
          setEmpresas(todasLasEmpresas);
          setEmpresaSeleccionada(
            (prev) =>
              prev ??
              (todasLasEmpresas.length > 0 ? todasLasEmpresas[0] : null),
          );
          return;
        }

        if (usuarioActual.trabajador_id) {
          const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
          if (isCancelled) return;
          const empresasTrabajador = await obtenerEmpresasTrabajador(
            usuarioActual.trabajador_id,
            token || "",
          );
          if (isCancelled) return;
          setEmpresas(empresasTrabajador);
          setEmpresaSeleccionada(
            (prev) =>
              prev ??
              (empresasTrabajador.length > 0 ? empresasTrabajador[0] : null),
          );
        }
      } catch (error) {
        if (!isCancelled) {
          console.error(
            "Error al inicializar las empresas del usuario:",
            error,
          );
        }
      }
    }

    inicializarEntornoUsuario();

    return () => {
      isCancelled = true;
    };
  }, [usuarioActual, cargandoSesionLocal]);

  // ====================================================================
  // MOTOR 3: CARGA DE EXPEDIENTE LABORAL (Con control de Race Conditions)
  // ====================================================================
  useEffect(() => {
    if (cargandoSesionLocal) return;

    let isCancelled = false;

    async function cargarFichaLaboralCompuesta() {
      if (!usuarioActual?.trabajador_id || !empresaSeleccionada?.id) {
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
            obtenerContratosTrabajador(usuarioActual.trabajador_id),
            obtenerAsignacionesTurnoTrabajador(usuarioActual.trabajador_id),
          ]);

        if (isCancelled) return;

        setTrabajadorActual(datosTrabajador);

        const contratoVigente = listaContratos.find(
          (c: Contrato) =>
            c.activo === true && c.empresa_id === empresaSeleccionada.id,
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
              console.error(
                "Error al resolver el objeto Centro de Trabajo:",
                errCentro,
              );
              setCentroTrabajoActual(null);
            }
          }
        } else {
          setCentroTrabajoActual(null);
        }

        const hoyStr = new Date().toISOString().split("T")[0];
        const turnoVigente = listaTurnos.find((t: AsignacionTurno) => {
          const coincideFiltro =
            (t as any).empresa_id === empresaSeleccionada.id;
          const esPosteriorInicio = t.fecha_inicio <= hoyStr;
          const esAnteriorFin = !t.fecha_fin || t.fecha_fin >= hoyStr;
          return coincideFiltro && esPosteriorInicio && esAnteriorFin;
        });
        setTurnoActual(turnoVigente ?? null);
      } catch (error) {
        if (!isCancelled) {
          console.error(
            "Error en la sincronización del expediente laboral:",
            error,
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
  }, [
    usuarioActual?.trabajador_id,
    empresaSeleccionada?.id,
    cargandoSesionLocal,
  ]);

  // ====================================================================
  // MOTOR 4: PERSISTENCIA ACTIVA DE ESCRITURA EN DISCO
  // ====================================================================
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
            AsyncStorage.setItem(
              STORAGE_KEY_EMPRESAS,
              JSON.stringify(empresas),
            ),
            empresaSeleccionada
              ? AsyncStorage.setItem(
                  STORAGE_KEY_SELECCIONADA,
                  JSON.stringify(empresaSeleccionada),
                )
              : AsyncStorage.removeItem(STORAGE_KEY_SELECCIONADA),
            centroTrabajoActual
              ? AsyncStorage.setItem(
                  STORAGE_KEY_CENTRO_SELECCIONADO,
                  JSON.stringify(centroTrabajoActual),
                )
              : AsyncStorage.removeItem(STORAGE_KEY_CENTRO_SELECCIONADO),
          ]);
        } else {
          await Promise.all([
            AsyncStorage.removeItem(STORAGE_KEY_USUARIO),
            AsyncStorage.removeItem(STORAGE_KEY_EMPRESAS),
            AsyncStorage.removeItem(STORAGE_KEY_SELECCIONADA),
            AsyncStorage.removeItem(STORAGE_KEY_CENTRO_SELECCIONADO),
          ]);
        }
      } catch (error) {
        console.error("Error al persistir cambios de sesión:", error);
      }
    }

    guardarEstadosEnDisco();
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
