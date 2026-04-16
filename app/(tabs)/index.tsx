import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";

import { HelloWave } from "@/components/hello-wave";
import {
  crearFichaje,
  Empresa,
  getEmpresa,
  obtenerFichajes,
} from "@/components/models/types";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTrabajador } from "@/context/TrabajadorContext";
import { Link } from "expo-router";

export default function HomeScreen() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const { trabajadorActual, empresaSeleccionada } = useTrabajador();

  useEffect(() => {
    getEmpresa(empresaSeleccionada?.id || 0).then(setEmpresa);
  }, [empresaSeleccionada]);

  const calcularHorasTrabajadas = () => {
    if (!trabajadorActual) return 0;
    const fichajesTrabajador = obtenerFichajes(trabajadorActual.id);
    const ultimaEntrada = fichajesTrabajador
      .filter((f) => f.tipo === "entrada")
      .pop();
    if (!ultimaEntrada) return 0;
    const ahora = new Date();
    const diffMs = ahora.getTime() - ultimaEntrada.fecha.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60)); // hours
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#6b8992", dark: "#2d3b3f" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title" style={styles.titleContainer}>
          Registro Horario
        </ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedView style={styles.infoCard}>
          <ThemedText type="subtitle">
            Empresa: {empresaSeleccionada?.nombre || empresa?.nombre}
          </ThemedText>
          <ThemedText type="subtitle">Horario: 9:00 - 17:00</ThemedText>
          <ThemedText type="subtitle">
            Horas trabajadas hoy: {calcularHorasTrabajadas()}
          </ThemedText>
        </ThemedView>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedView style={styles.buttonRow}>
          <Pressable
            style={styles.button}
            onPress={() => {
              if (trabajadorActual) {
                crearFichaje(
                  trabajadorActual.id,
                  empresaSeleccionada?.id || 0,
                  "entrada",
                );
                Alert.alert(
                  "Fichaje",
                  `Entrada registrada a las ${new Date().toLocaleTimeString()}`,
                );
              }
            }}
          >
            <ThemedText type="subtitle">Fichar Entrada</ThemedText>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => {
              if (trabajadorActual) {
                crearFichaje(
                  trabajadorActual.id,
                  empresaSeleccionada?.id || 0,
                  "salida",
                );
                Alert.alert(
                  "Fichaje",
                  `Salida registrada a las ${new Date().toLocaleTimeString()}`,
                );
              }
            }}
          >
            <ThemedText type="subtitle">Fichar Salida</ThemedText>
          </Pressable>
        </ThemedView>
        <ThemedView style={styles.buttonRow}>
          <Pressable
            style={styles.button}
            onPress={() => {
              if (trabajadorActual) {
                crearFichaje(
                  trabajadorActual.id,
                  empresaSeleccionada?.id || 0,
                  "descanso",
                );
                Alert.alert(
                  "Fichaje",
                  `Descanso registrado a las ${new Date().toLocaleTimeString()}`,
                );
              }
            }}
          >
            <ThemedText type="subtitle">Fichar Descanso</ThemedText>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => {
              if (trabajadorActual) {
                crearFichaje(
                  trabajadorActual.id,
                  empresaSeleccionada?.id || 0,
                  "horas_extra",
                );
                Alert.alert(
                  "Fichaje",
                  `Horas extra registradas a las ${new Date().toLocaleTimeString()}`,
                );
              }
            }}
          >
            <ThemedText type="subtitle">Fichar Horas Extra</ThemedText>
          </Pressable>
        </ThemedView>
        <Link href="/(tabs)/empresas" asChild>
          <Pressable style={styles.button}>
            <ThemedText type="subtitle">Cambiar de Empresa</ThemedText>
          </Pressable>
        </Link>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    color: "#333",
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    flex: 1,
    margin: 5,
  },
  infoCard: {
    backgroundColor: "#E0F7FA",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#B2EBF2",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
