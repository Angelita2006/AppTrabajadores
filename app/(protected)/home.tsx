import React, { useEffect, useState } from "react";
import { Alert, Animated, Pressable, StyleSheet } from "react-native";

import { Link } from "expo-router";
import { HelloWave } from "../../components/hello-wave";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import {
  ProveedorTrabajador,
  useTrabajador,
} from "../../context/TrabajadorContext";
import { Horario } from "../../src/models/horarios";
import {
  crearFichaje,
  obtenerFichajesEmpresaTrabajador,
} from "../../src/services/fichajesService";
import { obtenerHorarioTrabajadorEmpresa } from "../../src/services/horariosService";

export default function HomeScreen() {
  const { trabajadorActual, empresaSeleccionada } = useTrabajador();

  const [horario, setHorario] = useState<Horario | null>(null);

  useEffect(() => {
    async function cargarHorario() {
      // Protección: si no hay empresa o trabajador, no pedimos el horario
      if (empresaSeleccionada?.id && trabajadorActual?.id) {
        const horario = obtenerHorarioTrabajadorEmpresa(
          empresaSeleccionada.id,
          trabajadorActual.id,
        );
        setHorario(horario);
      }
    }
    cargarHorario();
  }, [empresaSeleccionada?.id, trabajadorActual?.id]);

  const calcularHorasTrabajadas = () => {
    if (!trabajadorActual?.id) return;

    const fichajesTrabajador = obtenerFichajesEmpresaTrabajador(
      trabajadorActual.id,
      empresaSeleccionada?.id || 0,
    );

    const ultimaEntrada = fichajesTrabajador
      .filter((f) => f.tipo === "entrada")
      .pop();

    //if (!ultimaEntrada) return alert("No hay ningún fichaje de entrada aún");
    const ahora = new Date();
    let diffMs = 0;
    if (ultimaEntrada)
      diffMs = ahora.getTime() - ultimaEntrada.fecha_hora.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60)); // hours
  };

  return (
    <>
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
      >
        <ProveedorTrabajador>
          {(empresaSeleccionada?.id && trabajadorActual?.id && (
            <>
              <ThemedView style={styles.stepContainer}>
                <ThemedView style={styles.infoCard}>
                  <ThemedText type="subtitle">
                    Hola {trabajadorActual?.nombre || ""} <HelloWave />
                  </ThemedText>
                  <ThemedText type="subtitle">
                    [ {empresaSeleccionada?.nombre || ""} ]
                  </ThemedText>
                  <ThemedText type="subtitle">
                    Horario:{" "}
                    {horario?.hora_entrada1?.getHours() ||
                      "00" +
                        ":" +
                        (horario?.hora_entrada1?.getMinutes() || "00")}{" "}
                    a{" "}
                    {horario?.hora_salida1?.getHours() ||
                      "00" +
                        ":" +
                        (horario?.hora_salida1?.getMinutes() || "00")}
                    {horario?.hora_entrada2 && horario?.hora_salida2 && (
                      <>
                        {" "}
                        y{" "}
                        {horario?.hora_entrada2?.getHours() ||
                          "00" +
                            ":" +
                            (horario?.hora_entrada2?.getMinutes() || "00")}{" "}
                        a{" "}
                        {horario?.hora_salida2?.getHours() ||
                          "00" +
                            ":" +
                            (horario?.hora_salida2?.getMinutes() || "00")}
                      </>
                    )}
                  </ThemedText>
                  <ThemedText type="subtitle">
                    ·{" "}
                    {trabajadorActual?.estado?.toString() || "Sin fichajes aún"}{" "}
                    ·
                  </ThemedText>
                  <ThemedText type="subtitle">
                    {`Tiempo trabajado hoy\n${calcularHorasTrabajadas() || 0}`}
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

                <Link href="../(protected)/empresas" asChild>
                  <Pressable style={styles.button}>
                    <ThemedText type="subtitle">Cambiar de Empresa</ThemedText>
                  </Pressable>
                </Link>
              </ThemedView>
            </>
          )) || (
            <ThemedView style={styles.infoCard}>
              <ThemedText type="subtitle">
                Inicia sesión y selecciona una empresa para ver tu horario y
                poder fichar.
              </ThemedText>
            </ThemedView>
          )}
        </ProveedorTrabajador>
      </Animated.ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    backgroundColor: "#e0e0e000",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    color: "#38565a",
  },
  stepContainer: {
    backgroundColor: "#e0e0e000",
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
    backgroundColor: "#38565a",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    flex: 1,
    margin: 5,
  },
  infoCard: {
    backgroundColor: "#38565a",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#B2EBF2",
  },
  buttonRow: {
    backgroundColor: "#e0e0e000",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
