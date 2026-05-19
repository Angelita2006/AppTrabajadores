import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { HelloWave } from "../../components/hello-wave";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import {
  ProveedorTrabajador,
  useTrabajador,
} from "../../context/TrabajadorContext";
import { Fichaje } from "../../src/models/fichajes";
import { Horario } from "../../src/models/horarios";
import { Estado } from "../../src/models/trabajadores";
import { obtenerFichajesEmpresaTrabajador } from "../../src/services/fichajesService";
import { obtenerHorarioTrabajadorEmpresa } from "../../src/services/horariosService";
import { getUltimoFichajeTrabajador } from "../../src/services/trabajadoresService";

export default function HomeScreen() {
  // Calendar.requestCalendarPermissionsAsync().then(({ status }) => {
  //   if (status === "granted") {
  //     Calendar.getCalendarsAsync().then((calendars) => {
  //       console.log("Calendars:", calendars);
  //     });
  //   } else {
  //     console.log("Permiso de calendario denegado");
  //   }
  // });

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

    const ahora = new Date();
    let diffMs = 0;
    if (ultimaEntrada)
      diffMs = ahora.getTime() - ultimaEntrada.fecha_hora.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60)); // hours
  };

  // const ultimoFichaje = getUltimoFichajeTrabajador(trabajadorActual?.id || 0);
  const [ultimoFichaje, setUltimoFichaje] = useState<Fichaje | null>(null);

  // useEffect(() => {
  //   if (trabajadorActual?.id) {
  //     const fichaje = getUltimoFichajeTrabajador(trabajadorActual.id);
  //     setUltimoFichaje(fichaje);
  //   }
  // }, [trabajadorActual?.id]);

  useEffect(() => {
    async function cargarUltimoFichaje() {
      if (trabajadorActual?.id) {
        const fichaje = getUltimoFichajeTrabajador(trabajadorActual.id);
        setUltimoFichaje(fichaje);
      }
    }
    cargarUltimoFichaje();
  }, [trabajadorActual?.id]);

  // const handleFichar = (
  //   tipo: "entrada" | "salida" | "descanso" | "horas_extra",
  // ) => {
  //   try {
  //     crearFichaje(
  //       trabajadorActual?.id || 0,
  //       empresaSeleccionada?.id || 0,
  //       tipo,
  //     );
  //   } catch (error) {
  //     Alert.alert("Error al crear el fichaje: " + error);
  //   }
  //   Alert.alert(
  //     "Fichaje",
  //     `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} + ${tipo === "entrada" || tipo === "salida" ? " registrada " : tipo === "descanso" ? " registrado " : tipo === "horas_extra" ? " registradas " : ""} a las ${new Date().toLocaleTimeString()}`,
  //   );
  // };

  // const handleFichar = async (
  //   tipo: "entrada" | "salida" | "descanso" | "horas_extra",
  // ) => {
  //   // 1. Validación de seguridad preventiva antes de enviar datos corruptos
  //   if (!trabajadorActual?.id || !empresaSeleccionada?.id) {
  //     Alert.alert(
  //       "Error",
  //       "No se ha detectado el trabajador o la empresa seleccionada.",
  //     );
  //     return;
  //   }

  //   try {
  //     // 2. Esperamos de verdad a que responda tu backend / base de datos
  //     await crearFichaje(trabajadorActual.id, empresaSeleccionada.id, tipo);

  //     // 3. El éxito solo se muestra si la línea de arriba no ha lanzado ninguna excepción
  //     Alert.alert(
  //       "Fichaje",
  //       `${tipo.charAt(0).toUpperCase() + tipo.slice(1)}${
  //         tipo === "entrada" || tipo === "salida"
  //           ? " registrada"
  //           : tipo === "descanso"
  //             ? " registrado"
  //             : " registradas"
  //       } a las ${new Date().toLocaleTimeString()}`,
  //     );
  //   } catch (error) {
  //     // 4. Ahora sí saltará aquí inmediatamente si el servidor responde un estatus 400/500 o falla la red
  //     Alert.alert("Error", "No se pudo crear el fichaje: " + error);
  //   }
  // };

  const handleFichar = (
    tipo: "entrada" | "salida" | "descanso" | "horas_extra",
  ) => {
    console.log("BOTÓN PRESIONADO:", tipo);
  };

  return (
    <>
      <ProveedorTrabajador>
        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        >
          {(empresaSeleccionada?.id && trabajadorActual?.id && (
            <>
              <ThemedView style={styles.stepContainer}>
                <ThemedView style={styles.infoCard}>
                  <ThemedText type="subtitle">
                    Hola {trabajadorActual?.nombre || "Usuario"} <HelloWave />
                  </ThemedText>
                  <ThemedText type="subtitle">
                    [ {empresaSeleccionada?.nombre || "Empresa"} ]
                  </ThemedText>

                  <ThemedText type="subtitle">
                    Horario:{" "}
                    {(horario?.hora_entrada1?.getHours() || "00") +
                      ":" +
                      (horario?.hora_entrada1?.getMinutes() || "00")}{" "}
                    a{" "}
                    {(horario?.hora_salida1?.getHours() || "00") +
                      ":" +
                      (horario?.hora_salida1?.getMinutes() || "00")}
                    {horario?.hora_entrada2 && horario?.hora_salida2 && (
                      <>
                        {" "}
                        y{" "}
                        {(horario?.hora_entrada2?.getHours() || "00") +
                          ":" +
                          (horario?.hora_entrada2?.getMinutes() || "00")}{" "}
                        a{" "}
                        {(horario?.hora_salida2?.getHours() || "00") +
                          ":" +
                          (horario?.hora_salida2?.getMinutes() || "00")}
                      </>
                    )}
                  </ThemedText>
                  <ThemedText type="subtitle">
                    ·{" "}
                    {
                      Estado[
                        Number.parseInt(
                          trabajadorActual?.estado?.toString() || "0",
                        )
                      ]
                    }{" "}
                    ·
                  </ThemedText>
                  <ThemedText type="subtitle">
                    {`Tiempo trabajado hoy\n${calcularHorasTrabajadas() || 0}`}
                  </ThemedText>
                  <ThemedText type="subtitle">
                    {`Último fichaje ${ultimoFichaje?.tipo ? "de " + ultimoFichaje.tipo : ""}\n${ultimoFichaje?.fecha ? new Date(ultimoFichaje.fecha).toLocaleString() : "No hay fichajes aún"}`}
                  </ThemedText>
                </ThemedView>
              </ThemedView>

              <ThemedView style={styles.stepContainer}>
                <ThemedView
                  style={[styles.buttonRow, { zIndex: 99, elevation: 99 }]}
                >
                  <Pressable
                    style={styles.button}
                    onPress={() => handleFichar("entrada")}
                  >
                    <ThemedText type="subtitle">Fichar Entrada</ThemedText>
                  </Pressable>

                  <Pressable
                    style={styles.button}
                    onPress={() => handleFichar("salida")}
                  >
                    <ThemedText type="subtitle">Fichar Salida</ThemedText>
                  </Pressable>
                </ThemedView>

                <ThemedView style={styles.buttonRow}>
                  <Pressable
                    style={styles.button}
                    onPress={() => handleFichar("descanso")}
                  >
                    <ThemedText type="subtitle">Fichar Descanso</ThemedText>
                  </Pressable>

                  <Pressable
                    style={styles.button}
                    onPress={() => handleFichar("horas_extra")}
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
            <>
              <ThemedView style={styles.infoContainer}>
                <ThemedText style={styles.infotitle} type="subtitle">
                  Inicia sesión y selecciona una empresa para ver tu horario y
                  poder fichar.
                </ThemedText>
                <Link href="../(protected)/empresas" asChild>
                  <Pressable style={styles.button}>
                    <ThemedText type="subtitle">Seleccionar Empresa</ThemedText>
                  </Pressable>
                </Link>
              </ThemedView>
            </>
          )}
        </Animated.ScrollView>
      </ProveedorTrabajador>
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
  infotitle: {
    color: "#38565a",
    fontSize: 18,
    textAlign: "center",
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
  infoContainer: {
    backgroundColor: "#e0e0e000",
    gap: 8,
    marginBottom: 8,
    padding: 15,
    alignItems: "center",
  },
  buttonRow: {
    backgroundColor: "#e0e0e000",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
