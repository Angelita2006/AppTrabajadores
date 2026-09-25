import { obtenerDispositivosCentro } from "@/src/modules/dispositivos-fichaje/api/services";
import { Dispositivo } from "@/src/modules/dispositivos-fichaje/types/dispositivo-fichaje";
import {
  obtenerFichajesTrabajadorEntreFechas,
  registrarFichaje,
} from "@/src/modules/fichajes/api/services";
import { RegistroFichaje } from "@/src/modules/fichajes/types/registrofichaje";
import { obtenerTiposEventosEmpresa } from "@/src/modules/tipos_eventos_fichaje/api/services";
import { obtenerTrabajador } from "@/src/modules/trabajadores/api/services";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import { formatearFecha, formatearSegundos } from "@/src/utils/formaters";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import SignatureCanvas from "react-native-signature-canvas";
import {
  Estado,
  ESTADOS_TRABAJADOR,
} from "../../src/modules/trabajadores/types/trabajador";
import { useSesion } from "../../src/modules/usuarios/store/SesionContextZustand";
import { ThemedText } from "../../src/shared/components/ThemedText";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";
import { IconSymbol } from "../../src/shared/ui/IconSymbol";

export default function HomeScreen() {
  const {
    usuarioActual,
    empresaActual,
    contratoActual,
    centroTrabajoActual,
    cargandoSesionLocal,
  } = useSesion();

  const [horaActual, setHoraActual] = useState("");
  const [estadoActual, setEstadoActual] = useState<Estado>(
    ESTADOS_TRABAJADOR.INACTIVO,
  );
  const [etiquetaEstadoTexto, setEtiquetaEstadoTexto] = useState("Cargando...");
  const [cargando, setCargando] = useState(true);

  const [segundosAcumuladosHoy, setSegundosAcumuladosHoy] = useState<number>(0);
  const [tiempoFormateado, setTiempoFormateado] = useState("00:00:00");
  const [timestampBaseActual, setTimestampBaseActual] = useState<number | null>(
    null,
  );

  const { mostrarError, mostrarMensaje } = useAppModal();

  const [mapaTiposEvento, setMapaTiposEvento] = useState<
    Record<string, string>
  >({});

  // Estados y referencias para la firma digital
  const [modalFirmaVisible, setModalFirmaVisible] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState<{
    nuevoEstado: Estado;
    tipoEventoCodigo: string;
    tipoEventoId: string;
  } | null>(null);
  const signatureRef = useRef<any>(null);
  const webCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const esAdmin =
      usuarioActual?.tipo_usuario === "Admin_empresa" ||
      usuarioActual?.tipo_usuario === "Admin_gestoría";
    if (!cargandoSesionLocal && esAdmin) {
      router.replace("/(tabs)/perfil");
    }
  }, [usuarioActual, cargandoSesionLocal]);

  // Si está cargando o es un administrador intentando entrar, mostramos un loader vacío
  // para evitar que se renderice ni un solo segundo la interfaz de fichaje.
  if (cargandoSesionLocal) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0F172A",
        }}
      >
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  function obtenerFechaHoraCentroISO(zonaHoraria: string): string {
    const ahora = new Date();
    try {
      const formateador = new Intl.DateTimeFormat("sv-SE", {
        timeZone: zonaHoraria,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const partes = formateador.formatToParts(ahora);
      const dic = Object.fromEntries(partes.map((p) => [p.type, p.value]));

      return `${dic.year}-${dic.month}-${dic.day}T${dic.hour}:${dic.minute}:${dic.second}.000`;
    } catch (error: any) {
      mostrarError(
        "Error al calcular la fecha y hora ajustada a la zona horaria del centro: " +
          obtenerMensajeAmigableError(error.message),
      );
      return ahora.toISOString().replace("Z", "");
    }
  }

  // Función asíncrona para obtener la etiqueta del estado
  const obtenerEtiquetaEstado = async (): Promise<string> => {
    if (!usuarioActual?.trabajador_id) return ESTADOS_TRABAJADOR.INACTIVO;
    try {
      const trabajador = await obtenerTrabajador(usuarioActual.trabajador_id);
      return trabajador?.estado
        ? String(trabajador.estado)
        : ESTADOS_TRABAJADOR.INACTIVO;
    } catch (error) {
      return ESTADOS_TRABAJADOR.INACTIVO;
    }
  };

  // Efecto para actualizar la variable de forma síncrona para la interfaz
  useEffect(() => {
    let isMounted = true;
    obtenerEtiquetaEstado().then((etiqueta) => {
      if (isMounted) {
        setEtiquetaEstadoTexto(etiqueta);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [usuarioActual?.trabajador_id, estadoActual]);

  // Reloj local de hora actual en el centro
  useEffect(() => {
    const actualizarHoraServidor = () => {
      const ahora = new Date();
      const zonaObjetivo = centroTrabajoActual?.zona_horaria || "Europe/Madrid";

      try {
        const horaCentroStr = ahora.toLocaleTimeString("es-ES", {
          timeZone: zonaObjetivo,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        setHoraActual(horaCentroStr);
      } catch (error: any) {
        console.error(error.message);
        setHoraActual(ahora.toLocaleTimeString("es-ES", { hour12: false }));
      }
    };

    actualizarHoraServidor();
    const intervaloReloj = setInterval(actualizarHoraServidor, 1000);

    return () => clearInterval(intervaloReloj);
  }, [centroTrabajoActual?.id, centroTrabajoActual?.zona_horaria]);

  // Sincronizar tipos de eventos y fichajes de hoy
  useEffect(() => {
    let isMounted = true;

    async function sincronizarJornadaActual() {
      if (!usuarioActual?.trabajador_id) {
        if (isMounted) setCargando(false);
        return;
      }

      try {
        if (isMounted) setCargando(true);

        // 1. Cargar y mapear los tipos de evento de fichaje
        const tiposEvento = await obtenerTiposEventosEmpresa(empresaActual!.id);
        const mapa: Record<string, string> = {};
        tiposEvento.forEach((tipo: { id: string; codigo: string }) => {
          mapa[tipo.codigo] = tipo.id;
        });

        if (isMounted) setMapaTiposEvento(mapa);

        const hoy = formatearFecha(new Date());

        // 2. Obtener los fichajes del día
        const fichajesHoy: RegistroFichaje[] =
          await obtenerFichajesTrabajadorEntreFechas(
            usuarioActual.trabajador_id,
            hoy,
            hoy,
          );

        if (!isMounted) return;

        if (fichajesHoy.length === 0) {
          setEstadoActual(ESTADOS_TRABAJADOR.INACTIVO);
          setSegundosAcumuladosHoy(0);
          setTiempoFormateado("00:00:00");
          setTimestampBaseActual(null);
          return;
        }

        const eventos = [...fichajesHoy].sort(
          (a, b) =>
            new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime(),
        );

        let segundosCalculados = 0;
        let marcaEntradaActiva: number | null = null;
        let marcaPausaActiva: number | null = null;

        eventos.forEach((fichaje) => {
          const tMs = new Date(fichaje.fecha_hora).getTime();

          if (fichaje.tipo_evento_id === mapa["ENTRADA"]) {
            marcaEntradaActiva = tMs;
          } else if (fichaje.tipo_evento_id === mapa["INICIO_PAUSA"]) {
            if (marcaEntradaActiva !== null) {
              segundosCalculados += Math.max(
                0,
                Math.floor((tMs - marcaEntradaActiva) / 1000),
              );
              marcaEntradaActiva = null;
            }
            marcaPausaActiva = tMs;
          } else if (fichaje.tipo_evento_id === mapa["FIN_PAUSA"]) {
            marcaPausaActiva = null;
            marcaEntradaActiva = tMs;
          } else if (fichaje.tipo_evento_id === mapa["SALIDA"]) {
            if (marcaEntradaActiva !== null) {
              segundosCalculados += Math.max(
                0,
                Math.floor((tMs - marcaEntradaActiva) / 1000),
              );
              marcaEntradaActiva = null;
            }
          }
        });

        const ultimoFichaje = eventos[eventos.length - 1];
        const ultimoEventoUuid = ultimoFichaje.tipo_evento_id;

        if (ultimoEventoUuid === mapa["SALIDA"]) {
          setEstadoActual(ESTADOS_TRABAJADOR.ACTIVO);
          setTimestampBaseActual(null);
        } else if (ultimoEventoUuid === mapa["INICIO_PAUSA"]) {
          setEstadoActual(ESTADOS_TRABAJADOR.DESCANSANDO);
          setTimestampBaseActual(marcaPausaActiva);
        } else {
          setEstadoActual(ESTADOS_TRABAJADOR.TRABAJANDO);
          setTimestampBaseActual(marcaEntradaActiva);
        }

        setSegundosAcumuladosHoy(segundosCalculados);

        const timestampBase =
          ultimoEventoUuid === mapa["INICIO_PAUSA"]
            ? marcaPausaActiva
            : marcaEntradaActiva;

        if (
          (ultimoEventoUuid === mapa["ENTRADA"] ||
            ultimoEventoUuid === mapa["FIN_PAUSA"] ||
            ultimoEventoUuid === mapa["INICIO_PAUSA"]) &&
          timestampBase !== null
        ) {
          const tramoActual = Math.max(
            0,
            Math.floor((Date.now() - timestampBase) / 1000),
          );
          setTiempoFormateado(
            formatearSegundos(segundosCalculados + tramoActual),
          );
        } else {
          setTiempoFormateado(formatearSegundos(segundosCalculados));
        }
      } catch (error: any) {
        mostrarError(
          "Error al cargar los datos de la jornada actual: " +
            obtenerMensajeAmigableError(error.message),
        );
      } finally {
        if (isMounted) setCargando(false);
      }
    }

    sincronizarJornadaActual();

    return () => {
      isMounted = false;
    };
  }, [usuarioActual?.trabajador_id]);

  // Actualizador diferencial de tiempo acumulado en pantalla
  useEffect(() => {
    let intervalo: any;

    const actualizarRelojDiferencial = () => {
      if (
        estadoActual === ESTADOS_TRABAJADOR.ACTIVO ||
        timestampBaseActual === null
      )
        return;
      const segundosTramoAbierto = Math.max(
        0,
        Math.floor((Date.now() - timestampBaseActual) / 1000),
      );
      setTiempoFormateado(
        formatearSegundos(segundosAcumuladosHoy + segundosTramoAbierto),
      );
    };

    if (
      estadoActual !== ESTADOS_TRABAJADOR.ACTIVO &&
      !cargando &&
      timestampBaseActual !== null
    ) {
      actualizarRelojDiferencial();
      intervalo = setInterval(actualizarRelojDiferencial, 1000);
    }

    const subscripcionAppState = AppState.addEventListener(
      "change",
      (siguienteEstadoAppState: string) => {
        if (siguienteEstadoAppState === "active") {
          actualizarRelojDiferencial();
        }
      },
    );

    return () => {
      if (intervalo) clearInterval(intervalo);
      subscripcionAppState.remove();
    };
  }, [estadoActual, cargando, segundosAcumuladosHoy, timestampBaseActual]);

  const iniciarProcesoFichaje = (nuevoEstado: Estado, codigoEvento: string) => {
    if (
      !usuarioActual?.trabajador_id ||
      !empresaActual?.id ||
      !centroTrabajoActual?.id
    ) {
      mostrarMensaje(
        "Expediente Incompleto",
        "Selecciona una empresa y centro de trabajo válidos en tu Perfil antes de fichar.",
      );
      return;
    }

    const tipoEventoUuid = mapaTiposEvento[codigoEvento];

    if (!tipoEventoUuid) {
      mostrarMensaje(
        "Configuración Faltante",
        `El tipo de fichaje '${codigoEvento}' no se encuentra configurado. Contacte con administración.`,
      );
      return;
    }

    setAccionPendiente({
      nuevoEstado,
      tipoEventoCodigo: codigoEvento,
      tipoEventoId: tipoEventoUuid,
    });
    setModalFirmaVisible(true);
  };

  const handleFirmaOK = async (signatureUri: string) => {
    setModalFirmaVisible(false);
    if (!accionPendiente) return;

    const { nuevoEstado, tipoEventoCodigo, tipoEventoId } = accionPendiente;
    await registrarMarcajeHorario(
      nuevoEstado,
      tipoEventoCodigo,
      tipoEventoId,
      signatureUri,
      false,
    );
    setAccionPendiente(null);
  };

  const registrarMarcajeHorario = async (
    nuevoEstado: Estado,
    tipoEventoCodigo: string,
    tipoEventoId: string,
    signatureUri: string,
    forzarExtra: boolean = false,
  ) => {
    if (
      !usuarioActual?.trabajador_id ||
      !empresaActual?.id ||
      !centroTrabajoActual?.id
    ) {
      return;
    }

    try {
      setCargando(true);

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error(
          "Se requieren permisos de ubicación para registrar el fichaje.",
        );
      }

      let ubicacion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = ubicacion.coords;
      const zonaDelCentro = centroTrabajoActual.zona_horaria || "UTC";
      const fechaHoraAjustada = obtenerFechaHoraCentroISO(zonaDelCentro);

      const dispositivosCentro = await obtenerDispositivosCentro(
        centroTrabajoActual.id,
      );

      const tipoBuscado = Platform.OS === "web" ? "web" : "app_móvil";

      const dispositivoEncontrado = dispositivosCentro.find(
        (d: Dispositivo) =>
          d.tipo_dispositivo.toLocaleLowerCase() === tipoBuscado &&
          d.centro_trabajo_id === centroTrabajoActual.id,
      );

      if (!dispositivoEncontrado) {
        mostrarMensaje(
          "Dispositivos no configurados",
          "Dile al administrador de tu empresa que cree los dispositivos disponibles para fichar primero.",
        );
        setCargando(false);
        return;
      }

      const dispositivoIdUuid = dispositivoEncontrado.id;

      const respuestaFichaje = await registrarFichaje({
        trabajador_id: String(usuarioActual.trabajador_id),
        empresa_id: String(empresaActual.id),
        centro_trabajo_id: String(centroTrabajoActual.id),
        tipo_evento_id: tipoEventoId,
        metodo_fichaje: Platform.OS === "web" ? "Web" : "App_móvil",
        fecha_hora_dispositivo: fechaHoraAjustada,
        estado: "Válido",
        latitud: latitude,
        longitud: longitude,
        forzar_hora_extra: forzarExtra,
        dispositivo_id: dispositivoIdUuid,
        firma_digital: signatureUri,
        observaciones:
          tipoEventoCodigo === "ENTRADA"
            ? "Inicio de jornada"
            : tipoEventoCodigo === "SALIDA"
              ? "Cierre de jornada"
              : tipoEventoCodigo === "INICIO_PAUSA"
                ? "Inicio de descanso"
                : "Descanso terminado",
      });

      const fichajeId =
        respuestaFichaje?.id || (respuestaFichaje as any)?.fichaje_id;

      if (fichajeId && signatureUri && Platform.OS !== "web") {
        const baseDir = FileSystem.documentDirectory;
        if (baseDir) {
          const carpetaFirmas = `${baseDir}firmas_fichajes/`;
          const infoCarpeta = await FileSystem.getInfoAsync(carpetaFirmas);
          if (!infoCarpeta.exists) {
            await FileSystem.makeDirectoryAsync(carpetaFirmas, {
              intermediates: true,
            });
          }
          const rutaFirmaDestino = `${carpetaFirmas}firma_${fichajeId}.png`;
          const base64Clean = signatureUri.includes(",")
            ? signatureUri.split(",")[1]
            : signatureUri;

          await FileSystem.writeAsStringAsync(rutaFirmaDestino, base64Clean, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      }

      const ahoraMs = Date.now();

      if (timestampBaseActual !== null) {
        const segundosDelTramoQueCierra = Math.max(
          0,
          Math.floor((ahoraMs - timestampBaseActual) / 1000),
        );
        setSegundosAcumuladosHoy((prev) => {
          const totalNuevo = prev + segundosDelTramoQueCierra;
          setTiempoFormateado(formatearSegundos(totalNuevo));
          return totalNuevo;
        });
      }

      if (tipoEventoCodigo === "SALIDA") {
        setTimestampBaseActual(null);
      } else {
        setTimestampBaseActual(ahoraMs);
      }

      setEstadoActual(nuevoEstado);
      setCargando(false);
    } catch (error: any) {
      setCargando(false);

      const statusHttp = error?.response?.status;
      const mensajeBackend =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        error.toString() ||
        "";

      if (forzarExtra) {
        mostrarError(
          "Error al registrar el fichaje como horas extra en festivo: " +
            obtenerMensajeAmigableError(error.message),
        );
        return;
      }

      const esAusencia =
        typeof mensajeBackend === "string" &&
        mensajeBackend.toLowerCase().includes("ausencia");

      if (esAusencia) {
        mostrarError(
          mensajeBackend ||
            "No se puede registrar el fichaje porque existe una ausencia o periodo vacacional asignado para este día.",
        );
        return;
      }

      if (
        statusHttp === 409 ||
        (typeof mensajeBackend === "string" &&
          mensajeBackend.toLowerCase().includes("festivo"))
      ) {
        if (Platform.OS === "web") {
          const aceptarExtra = window.confirm(
            mensajeBackend ||
              "No se puede fichar en un día festivo/no laborable.\n\n¿Aún así quiere fichar como horas extra en festivo?",
          );
          if (aceptarExtra && accionPendiente) {
            registrarMarcajeHorario(
              nuevoEstado,
              tipoEventoCodigo,
              tipoEventoId,
              signatureUri,
              true,
            );
          }
        } else {
          Alert.alert(
            "Día Festivo / No Laborable",
            mensajeBackend ||
              "No se puede fichar en un día festivo/no laborable. ¿Aún así quiere fichar como horas extra en festivo?",
            [
              {
                text: "Cancelar",
                style: "cancel",
              },
              {
                text: "Aceptar",
                onPress: () => {
                  registrarMarcajeHorario(
                    nuevoEstado,
                    tipoEventoCodigo,
                    tipoEventoId,
                    signatureUri,
                    true,
                  );
                },
              },
            ],
          );
        }
      } else {
        mostrarError(
          "Error al procesar tu solicitud de fichaje: " +
            obtenerMensajeAmigableError(error.message),
        );
      }
    }
  };

  if (cargando && segundosAcumuladosHoy === 0 && timestampBaseActual === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F8FAFC",
        }}
      >
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Helper para interactuar con canvas en Web (Mouse y Touch)
  const setupWebCanvasEvents = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
      };
    };

    canvas.onmousedown = (e) => {
      isDrawingRef.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    canvas.onmousemove = (e) => {
      if (!isDrawingRef.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    window.onmouseup = () => {
      isDrawingRef.current = false;
    };
  };

  return (
    <AppScreen
      title="Control de Jornada"
      subtitle={`Sede: ${centroTrabajoActual?.nombre ?? "Sin asignar"}`}
    >
      <Row>
        <StatCard
          label="Tu Estado Actual"
          value={etiquetaEstadoTexto}
          tone={
            estadoActual === ESTADOS_TRABAJADOR.TRABAJANDO
              ? "success"
              : "warning"
          }
        />
        <StatCard
          label="Puesto Asignado"
          value={contratoActual?.puesto_trabajo ?? "Operario"}
        />
      </Row>

      <View style={{ height: 12 }} />

      <View style={{ flexDirection: "row", width: "100%", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Card>
            <View
              style={[
                styles.contenedorCentralHorario,
                { minHeight: 90, justifyContent: "center" },
              ]}
            >
              <ThemedText style={styles.cronometroLabel}>
                Hora Actual
              </ThemedText>
              <ThemedText
                style={[
                  styles.cronometroNumero,
                  {
                    color: "#0F172A",
                    fontSize: 24,
                    textAlign: "center",
                    marginTop: 4,
                  },
                ]}
              >
                {horaActual || "00:00:00"}
              </ThemedText>
            </View>
          </Card>
        </View>

        <View style={{ flex: 1 }}>
          <Card>
            <View
              style={[
                styles.contenedorCentralHorario,
                { minHeight: 90, justifyContent: "center" },
              ]}
            >
              <ThemedText
                style={[styles.cronometroLabel, { textAlign: "center" }]}
              >
                Acumulado Hoy
              </ThemedText>
              <ThemedText
                style={[
                  styles.cronometroNumero,
                  { fontSize: 24, textAlign: "center", marginTop: 4 },
                ]}
              >
                {tiempoFormateado}
              </ThemedText>
              {cargando && (
                <ActivityIndicator
                  size="small"
                  color="#2563EB"
                  style={{ position: "absolute", right: 8, top: 8 }}
                />
              )}
            </View>
          </Card>
        </View>
      </View>

      <ThemedText style={styles.sectionTitle}>
        Acciones de Control Horario
      </ThemedText>

      <View style={styles.panelAcciones}>
        {estadoActual === ESTADOS_TRABAJADOR.ACTIVO && (
          <Pressable
            style={[
              styles.botonAccion,
              styles.botonEntrada,
              cargando && styles.botonDeshabilitado,
            ]}
            onPress={() =>
              iniciarProcesoFichaje(ESTADOS_TRABAJADOR.TRABAJANDO, "ENTRADA")
            }
            disabled={cargando}
          >
            <IconSymbol name="play-circle" size={24} color="#FFFFFF" />
            <ThemedText style={styles.textoBoton}>Iniciar Jornada</ThemedText>
          </Pressable>
        )}

        {estadoActual !== ESTADOS_TRABAJADOR.ACTIVO && (
          <Pressable
            style={[
              styles.botonAccion,
              estadoActual === ESTADOS_TRABAJADOR.DESCANSANDO
                ? styles.botonEntrada
                : styles.botonPausa,
              cargando && styles.botonDeshabilitado,
            ]}
            onPress={() => {
              if (estadoActual === ESTADOS_TRABAJADOR.DESCANSANDO) {
                iniciarProcesoFichaje(
                  ESTADOS_TRABAJADOR.TRABAJANDO,
                  "FIN_PAUSA",
                );
              } else {
                iniciarProcesoFichaje(
                  ESTADOS_TRABAJADOR.DESCANSANDO,
                  "INICIO_PAUSA",
                );
              }
            }}
            disabled={cargando}
          >
            <IconSymbol
              name={
                estadoActual === ESTADOS_TRABAJADOR.DESCANSANDO
                  ? "play-circle"
                  : "pause"
              }
              size={24}
              color="#FFFFFF"
            />
            <ThemedText style={styles.textoBoton}>
              {estadoActual === ESTADOS_TRABAJADOR.DESCANSANDO
                ? "Reanudar Jornada"
                : "Iniciar Descanso"}
            </ThemedText>
          </Pressable>
        )}

        {estadoActual !== ESTADOS_TRABAJADOR.ACTIVO && (
          <Pressable
            style={[
              styles.botonAccion,
              styles.botonSalida,
              cargando && styles.botonDeshabilitado,
            ]}
            onPress={() =>
              iniciarProcesoFichaje(ESTADOS_TRABAJADOR.ACTIVO, "SALIDA")
            }
            disabled={cargando}
          >
            <IconSymbol name="stop" size={24} color="#FFFFFF" />
            <ThemedText style={styles.textoBoton}>Finalizar Jornada</ThemedText>
          </Pressable>
        )}
      </View>

      {/* Modal de Firma Digital */}
      {modalFirmaVisible && (
        <Modal
          visible={modalFirmaVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalFirmaVisible(false)}
        >
          <View style={styles.modalFondo}>
            <View style={styles.modalContenedor}>
              <ThemedText style={styles.modalTitulo}>
                Firma Requerida
              </ThemedText>
              <ThemedText style={styles.modalSubtitulo}>
                Por favor, firme en el recuadro para registrar el fichaje.
              </ThemedText>

              <View style={styles.canvasContainer}>
                {Platform.OS === "web" ? (
                  <View style={{ alignItems: "center", width: "100%" }}>
                    <canvas
                      ref={(ref) => {
                        webCanvasRef.current = ref;
                        if (ref) setupWebCanvasEvents(ref);
                      }}
                      width={320}
                      height={230}
                      style={{
                        border: "1px solid #CBD5E1",
                        backgroundColor: "#FFFFFF",
                        borderRadius: 8,
                        cursor: "crosshair",
                        touchAction: "none",
                      }}
                    />
                  </View>
                ) : (
                  <SignatureCanvas
                    ref={signatureRef}
                    onOK={(sig: string) => handleFirmaOK(sig)}
                    descriptionText="Firme aquí"
                    clearText="Limpiar"
                    confirmText="Guardar"
                    webStyle={`.m-signature-pad { box-shadow: none; border: 1px solid #cbd5e1; border-radius: 8px; }`}
                  />
                )}
              </View>

              <View style={styles.modalBotonesFila}>
                <Pressable
                  style={[styles.botonModal, styles.botonCancelarModal]}
                  onPress={() => {
                    setModalFirmaVisible(false);
                    setAccionPendiente(null);
                  }}
                >
                  <ThemedText style={styles.textoBotonCancelar}>
                    Cancelar
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={[styles.botonModal, styles.botonConfirmarModal]}
                  onPress={() => {
                    if (Platform.OS === "web") {
                      const canvas = webCanvasRef.current;
                      if (canvas) {
                        const dataURL = canvas.toDataURL("image/png");
                        handleFirmaOK(dataURL);
                      }
                    } else {
                      if (signatureRef.current) {
                        signatureRef.current.readSignature();
                      }
                    }
                  }}
                >
                  <ThemedText style={styles.textoBotonConfirmar}>
                    Aceptar Firma
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  contenedorCentralHorario: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    width: "100%",
  },
  cronometroLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  cronometroNumero: {
    fontSize: 42,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 8,
    fontVariant: ["tabular-nums"],
    marginBottom: 4,
    lineHeight: 50,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 16,
  },
  panelAcciones: { gap: 12, width: "100%" },
  botonAccion: {
    flexDirection: "row",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...Platform.select({
      web: { boxShadow: "0px 2px 4px rgba(0,0,0,0.1)" },
      default: { elevation: 2 },
    }),
  },
  botonEntrada: { backgroundColor: "#16A34A" },
  botonPausa: { backgroundColor: "#EA580C" },
  botonSalida: { backgroundColor: "#DC2626" },
  botonDeshabilitado: { opacity: 0.5 },
  textoBoton: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  modalFondo: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  modalContenedor: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
    ...Platform.select({
      web: { boxShadow: "0px 4px 12px rgba(0,0,0,0.15)" },
      default: { elevation: 5 },
    }),
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
    textAlign: "center",
  },
  modalSubtitulo: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
    textAlign: "center",
  },
  canvasContainer: {
    height: 140,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBotonesFila: {
    flexDirection: "row",
    gap: 12,
  },
  botonModal: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  botonCancelarModal: {
    backgroundColor: "#F1F5F9",
  },
  botonConfirmarModal: {
    backgroundColor: "#2563EB",
  },
  textoBotonCancelar: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 15,
  },
  textoBotonConfirmar: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
