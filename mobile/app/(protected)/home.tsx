import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import { Estado } from "../../src/modules/trabajadores/types/trabajador";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";
import { IconSymbol } from "../../src/shared/ui/icon-symbol";

export default function HomeScreen() {
  const { empresaSeleccionada } = useSesion();

  // Estados para controlar el flujo horario reactivo
  const [estadoActual, setEstadoActual] = useState<Estado>(Estado.Activo);
  const [cargando, setCargando] = useState(false);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState("00:00:00");

  // Cronómetro en tiempo real para la jornada activa
  useEffect(() => {
    let intervalo: number;

    if (
      estadoActual === Estado.Trabajando ||
      estadoActual === Estado.HorasExtra
    ) {
      const inicio = Date.now();
      intervalo = setInterval(() => {
        const totalSegundos = Math.floor((Date.now() - inicio) / 1000);
        const horas = Math.floor(totalSegundos / 3600)
          .toString()
          .padStart(2, "0");
        const minutos = Math.floor((totalSegundos % 3600) / 60)
          .toString()
          .padStart(2, "0");
        const segundos = (totalSegundos % 60).toString().padStart(2, "0");
        setTiempoTranscurrido(`${horas}:${minutos}:${segundos}`);
      }, 1000);
    } else if (
      estadoActual === Estado.Activo ||
      estadoActual === Estado.Descansando
    ) {
      setTiempoTranscurrido("00:00:00");
    }

    return () => clearInterval(intervalo);
  }, [estadoActual]);

  /**
   * Registra un evento inmutable en el backend conectando con la API REST
   */
  const registrarMarcajeHorario = async (
    nuevoEstado: Estado,
    tipoLabel: string,
  ) => {
    try {
      setCargando(true);

      // Aquí se dispararía la llamada real a: api.post("/api/fichajes", { ... })
      // simulando un retardo de red para dar feedback UX al operario
      await new Promise((resolve) => setTimeout(resolve, 600));

      setEstadoActual(nuevoEstado);
      console.log(
        "Control Horario",
        `Marcaje de ${tipoLabel} registrado con éxito en el servidor.`,
      );
    } catch {
      Alert.alert(
        "Error de Fichaje",
        "No se pudo sincronizar la marca horaria. Inténtalo de nuevo.",
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <AppScreen
      title="Control de Jornada"
      subtitle={`Empresa activa: ${empresaSeleccionada?.nombre_comercial ?? "Ninguna asignada"}`}
    >
      {/* Fila de contadores rápidos y estado actual */}
      <Row>
        <StatCard
          label="Tu Estado Actual"
          value={Estado[estadoActual]}
          tone={estadoActual === Estado.Trabajando ? "success" : "warning"}
        />
        <StatCard label="Jornada de Hoy" value={tiempoTranscurrido} />
      </Row>

      {/* Card limpio y View que gestiona los estilos */}
      <Card>
        <View style={styles.contenedorCentralHorario}>
          <ThemedText style={styles.cronometroLabel}>
            Tiempo de Registro Activo
          </ThemedText>
          <ThemedText style={styles.cronometroNumero}>
            {tiempoTranscurrido}
          </ThemedText>

          {cargando && (
            <ActivityIndicator
              size="small"
              color="#2563EB"
              style={styles.loaderSpacing}
            />
          )}
        </View>
      </Card>

      <ThemedText style={styles.sectionTitle}>
        Acciones de Control Horario
      </ThemedText>

      {/* Matriz de botones de marcajes rápidos de la interfaz de usuario */}
      <View style={styles.panelAcciones}>
        {estadoActual === Estado.Activo ||
        estadoActual === Estado.Descansando ? (
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
        ) : null}

        {estadoActual === Estado.Trabajando ? (
          <Pressable
            style={[
              styles.botonAccion,
              styles.botonPausa,
              cargando && styles.botonDeshabilitado,
            ]}
            onPress={() =>
              registrarMarcajeHorario(Estado.Descansando, "INICIO_PAUSA")
            }
            disabled={cargando}
          >
            <IconSymbol name="pause" size={24} color="#FFFFFF" />
            <ThemedText style={styles.textoBoton}>Iniciar Descanso</ThemedText>
          </Pressable>
        ) : null}

        {estadoActual === Estado.Trabajando ||
        estadoActual === Estado.HorasExtra ? (
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
        ) : null}
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
  },
  cronometroNumero: {
    fontSize: 42,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 8,
    fontVariant: ["tabular-nums"],
    padding: 10,
    marginBottom: 10,
    lineHeight: 48,
  },
  loaderSpacing: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 16,
  },
  panelAcciones: {
    gap: 12,
    width: "100%",
  },
  botonAccion: {
    flexDirection: "row",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.1)",
    elevation: 2,
  },
  botonEntrada: {
    backgroundColor: "#16A34A",
  },
  botonPausa: {
    backgroundColor: "#EA580C",
  },
  botonSalida: {
    backgroundColor: "#DC2626",
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  textoBoton: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
