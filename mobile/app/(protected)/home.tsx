import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  obtenerFichajesHoy,
  registrarFichaje,
} from "../../src/modules/trabajadores/api/services";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import { Estado } from "../../src/modules/trabajadores/types/trabajador";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";
import { IconSymbol } from "../../src/shared/ui/icon-symbol";

interface RegistroFichaje {
  id: string;
  tipo_evento: "ENTRADA" | "SALIDA" | "INICIO_PAUSA" | "FIN_PAUSA";
  fecha_hora: string;
}

export default function HomeScreen() {
  const {
    usuarioActual,
    empresaSeleccionada,
    contratoActual,
    centroTrabajoActual,
  } = useSesion();

  const [horaActual, setHoraActual] = useState("");
  const [estadoActual, setEstadoActual] = useState<Estado>(Estado.Activo);
  const [cargando, setCargando] = useState(true);

  const [segundosAcumuladosHoy, setSegundosAcumuladosHoy] = useState<number>(0);
  const [tiempoFormateado, setTiempoFormateado] = useState("00:00:00");
  const [timestampBaseActual, setTimestampBaseActual] = useState<number | null>(
    null,
  );

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
    } catch (error) {
      console.error("Zona horaria inválida, usando UTC como fallback", error);
      return ahora.toISOString().replace("Z", "");
    }
  }

  const formatearSegundos = (totales: number): string => {
    const horas = Math.floor(totales / 3600)
      .toString()
      .padStart(2, "0");
    const minutos = Math.floor((totales % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const segundos = (totales % 60).toString().padStart(2, "0");
    return `${horas}:${minutos}:${segundos}`;
  };

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
      } catch (e) {
        setHoraActual(ahora.toLocaleTimeString("es-ES", { hour12: false }));
      }
    };

    actualizarHoraServidor();
    const intervaloReloj = setInterval(actualizarHoraServidor, 1000);

    return () => clearInterval(intervaloReloj);
  }, [centroTrabajoActual?.id, centroTrabajoActual?.zona_horaria]);

  useEffect(() => {
    async function sincronizarJornadaActual() {
      if (!usuarioActual?.trabajador_id) return;

      try {
        setCargando(true);
        const fichajesHoy: RegistroFichaje[] = await obtenerFichajesHoy(
          usuarioActual.trabajador_id,
        );

        if (fichajesHoy.length === 0) {
          setEstadoActual(Estado.Activo);
          return;
        }

        const eventos = [...fichajesHoy].sort(
          (a, b) =>
            new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime(),
        );

        let segundosCalculados = 0;
        let marcaEntradaActiva: number | null = null;
        let marcaPausaActiva: number | null = null;

        eventos.forEach((fichaje, index) => {
          const tMs = new Date(fichaje.fecha_hora).getTime();

          if (fichaje.tipo_evento === "ENTRADA") {
            marcaEntradaActiva = tMs;
          } else if (fichaje.tipo_evento === "INICIO_PAUSA") {
            if (marcaEntradaActiva !== null) {
              segundosCalculados += Math.floor(
                (tMs - marcaEntradaActiva) / 1000,
              );
              marcaEntradaActiva = null;
            }
            marcaPausaActiva = tMs;
          } else if (fichaje.tipo_evento === "FIN_PAUSA") {
            if (marcaPausaActiva !== null) {
              segundosCalculados += Math.floor((tMs - marcaPausaActiva) / 1000);
              marcaPausaActiva = null;
            }
            marcaEntradaActiva = tMs;
          } else if (fichaje.tipo_evento === "SALIDA") {
            if (marcaEntradaActiva !== null) {
              segundosCalculados += Math.floor(
                (tMs - marcaEntradaActiva) / 1000,
              );
              marcaEntradaActiva = null;
            }
          }

          if (index === eventos.length - 1) {
            if (fichaje.tipo_evento === "SALIDA") {
              setEstadoActual(Estado.Activo);
            } else if (fichaje.tipo_evento === "INICIO_PAUSA") {
              setEstadoActual(Estado.Descansando);
            } else {
              setEstadoActual(Estado.Trabajando);
            }
          }
        });

        setSegundosAcumuladosHoy(segundosCalculados);

        const ultimoEvento = eventos[eventos.length - 1].tipo_evento;
        if (ultimoEvento === "ENTRADA" || ultimoEvento === "FIN_PAUSA") {
          setTimestampBaseActual(marcaEntradaActiva);
          const tramoActual = marcaEntradaActiva
            ? Math.floor((Date.now() - marcaEntradaActiva) / 1000)
            : 0;
          setTiempoFormateado(
            formatearSegundos(segundosCalculados + tramoActual),
          );
        } else if (ultimoEvento === "INICIO_PAUSA") {
          setTimestampBaseActual(marcaPausaActiva);
          const tramoActual = marcaPausaActiva
            ? Math.floor((Date.now() - marcaPausaActiva) / 1000)
            : 0;
          setTiempoFormateado(
            formatearSegundos(segundosCalculados + tramoActual),
          );
        } else {
          setTimestampBaseActual(null);
          setTiempoFormateado(formatearSegundos(segundosCalculados));
        }
      } catch (error) {
        console.error("Fallo de sincronización horaria:", error);
      } finally {
        setCargando(false);
      }
    }

    sincronizarJornadaActual();
  }, [usuarioActual]);

  useEffect(() => {
    const { AppState } = require("react-native");
    let intervalo: number;

    const actualizarRelojDiferencial = () => {
      if (estadoActual === Estado.Activo || timestampBaseActual === null)
        return;
      const segundosTramoAbierto = Math.floor(
        (Date.now() - timestampBaseActual) / 1000,
      );
      setTiempoFormateado(
        formatearSegundos(segundosAcumuladosHoy + segundosTramoAbierto),
      );
    };

    if (
      estadoActual !== Estado.Activo &&
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
      clearInterval(intervalo);
      subscripcionAppState.remove();
    };
  }, [estadoActual, cargando, segundosAcumuladosHoy, timestampBaseActual]);

  const registrarMarcajeHorario = async (
    nuevoEstado: Estado,
    tipoLabel: "ENTRADA" | "SALIDA" | "INICIO_PAUSA" | "FIN_PAUSA",
  ) => {
    if (
      !usuarioActual?.trabajador_id ||
      !empresaSeleccionada?.id ||
      !centroTrabajoActual?.id
    ) {
      Alert.alert(
        "Expediente Incompleto",
        "Selecciona una empresa y centro de trabajo válidos en tu Perfil antes de fichar.",
      );
      return;
    }

    try {
      setCargando(true);
      const zonaDelCentro = centroTrabajoActual.zona_horaria || "UTC";
      const fechaHoraAjustada = obtenerFechaHoraCentroISO(zonaDelCentro);

      await registrarFichaje({
        trabajador_id: usuarioActual.trabajador_id,
        empresa_id: empresaSeleccionada.id,
        centro_trabajo_id: centroTrabajoActual.id,
        tipo_evento_id: tipoLabel,
        metodo_fichaje: Platform.OS === "web" ? "Web" : "App_movil",
        fecha_hora_dispositivo: fechaHoraAjustada,
        observaciones:
          tipoLabel === "ENTRADA"
            ? "Inicio de jornada"
            : tipoLabel === "SALIDA"
              ? "Cierre de jornada"
              : tipoLabel === "INICIO_PAUSA"
                ? "Inicio de descanso"
                : "Descanso terminado",
      });

      if (timestampBaseActual !== null) {
        const segundosDelTramoQueCierra = Math.floor(
          (Date.now() - timestampBaseActual) / 1000,
        );
        setSegundosAcumuladosHoy((prev) => prev + segundosDelTramoQueCierra);
      }

      // Cerramos el tramo activo fijando la base del cronómetro a null.
      if (tipoLabel === "SALIDA") {
        setTimestampBaseActual(null);
      } else {
        setTimestampBaseActual(Date.now());
      }

      setEstadoActual(nuevoEstado);
    } catch (error) {
      Alert.alert(
        "Error de Fichaje",
        "La base de datos denegó el marcaje: " + error,
      );
    } finally {
      setCargando(false);
    }
  };

  if (cargando && segundosAcumuladosHoy === 0) {
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

  return (
    <AppScreen
      title="Control de Jornada"
      subtitle={`Sede: ${centroTrabajoActual?.nombre ?? "Sin asignar"}`}
    >
      <Row>
        <StatCard
          label="Tu Estado Actual"
          value={
            estadoActual === Estado.Descansando
              ? "En Descanso"
              : Estado[Number.parseInt(estadoActual.toString())]
          }
          tone={estadoActual === Estado.Trabajando ? "success" : "warning"}
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
        {estadoActual === Estado.Activo && (
          <Pressable
            style={[
              styles.botonAccion,
              styles.botonEntrada,
              cargando && styles.botonDeshabilitado,
            ]}
            onPress={() =>
              registrarMarcajeHorario(Estado.Trabajando, "ENTRADA")
            }
            disabled={cargando}
          >
            <IconSymbol name="play-circle" size={24} color="#FFFFFF" />
            <ThemedText style={styles.textoBoton}>Iniciar Jornada</ThemedText>
          </Pressable>
        )}

        {estadoActual !== Estado.Activo && (
          <Pressable
            style={[
              styles.botonAccion,
              estadoActual === Estado.Descansando
                ? styles.botonEntrada
                : styles.botonPausa,
              cargando && styles.botonDeshabilitado,
            ]}
            onPress={() => {
              if (estadoActual === Estado.Descansando) {
                registrarMarcajeHorario(Estado.Trabajando, "FIN_PAUSA");
              } else {
                registrarMarcajeHorario(Estado.Descansando, "INICIO_PAUSA");
              }
            }}
            disabled={cargando}
          >
            <IconSymbol
              name={
                estadoActual === Estado.Descansando ? "play-circle" : "pause"
              }
              size={24}
              color="#FFFFFF"
            />
            <ThemedText style={styles.textoBoton}>
              {estadoActual === Estado.Descansando
                ? "Reanudar Jornada"
                : "Iniciar Descanso"}
            </ThemedText>
          </Pressable>
        )}

        {estadoActual !== Estado.Activo && (
          <Pressable
            style={[
              styles.botonAccion,
              styles.botonSalida,
              cargando && styles.botonDeshabilitado,
            ]}
            onPress={() => registrarMarcajeHorario(Estado.Activo, "SALIDA")}
            disabled={cargando}
          >
            <IconSymbol name="stop" size={24} color="#FFFFFF" />
            <ThemedText style={styles.textoBoton}>Finalizar Jornada</ThemedText>
          </Pressable>
        )}
      </View>
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
});
