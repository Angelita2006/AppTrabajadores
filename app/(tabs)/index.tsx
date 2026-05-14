import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";

import { Horario } from "@/models/horarios";
import { getHorarioTrabajadorEmpresa } from "@/services/horariosService";
// import { obtenerEmpresasTrabajador } from "@/services/trabajadoresService";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { Link } from "expo-router";
import ParallaxScrollView from "../../components/parallax-scroll-view";
import { ThemedButton } from "../../components/themed-button";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useTrabajador } from "../../context/TrabajadorContext";
// import { Empresa } from "../../models/empresas";
import { crearFichaje, obtenerFichajes } from "../../models/fichajes";

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<any>>();

  const { trabajadorActual, empresaSeleccionada } = useTrabajador();
  // const [empresas, setEmpresas] = useState<Empresa[]>([]);

  // // 2. Cargamos los datos después del primer renderizado
  // useEffect(() => {
  //   async function cargar() {
  //     // Si no hay trabajador aún, no hacemos nada
  //     if (!trabajadorActual?.id) return;

  //     try {
  //       const data = await obtenerEmpresasTrabajador(trabajadorActual.id);
  //       setEmpresas(data);
  //     } catch (error) {
  //       console.error("Error cargando empresas:", error);
  //     }
  //   }
  //   cargar();
  // }, [trabajadorActual?.id]);

  const [horario, setHorario] = useState<Horario | null>(null);

  useEffect(() => {
    async function cargarHorario() {
      // Protección: si no hay empresa o trabajador, no pedimos el horario
      if (empresaSeleccionada?.id && trabajadorActual?.id) {
        const h = await getHorarioTrabajadorEmpresa(
          empresaSeleccionada.id,
          trabajadorActual.id,
        );
        setHorario(h);
      }
    }
    cargarHorario();
  }, [empresaSeleccionada?.id, trabajadorActual?.id]);

  const calcularHorasTrabajadas = () => {
    if (!trabajadorActual?.id) return;

    const fichajesTrabajador = obtenerFichajes(
      trabajadorActual.id,
      empresaSeleccionada?.id || 0,
    );

    const ultimaEntrada = fichajesTrabajador
      .filter((f) => f.tipo === "entrada")
      .pop();

    if (!ultimaEntrada) return alert("No hay ningún fichaje de entrada aún");
    const ahora = new Date();
    const diffMs = ahora.getTime() - ultimaEntrada.fecha_hora.getTime();
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
      </ThemedView>

      <ThemedButton
        title="Ir a pantalla Modal"
        onPress={() => (navigation as any).navigate("modal")}
      />

      <ThemedView style={styles.stepContainer}>
        <ThemedView style={styles.infoCard}>
          <ThemedText type="subtitle">
            Empresa: {empresaSeleccionada?.nombre || ""}
          </ThemedText>
          <ThemedText type="subtitle">
            Horario: {horario?.hora_entrada?.toDateString()} a{" "}
            {horario?.hora_salida?.toDateString()}
          </ThemedText>
          <ThemedText type="subtitle">
            Horas trabajadas hoy: {calcularHorasTrabajadas() || 0}
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
