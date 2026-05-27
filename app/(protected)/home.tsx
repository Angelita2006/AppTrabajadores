import { Link } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
// Añade ScrollView a tu importación de react-native
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { HelloWave } from "../../components/hello-wave";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useTrabajador } from "../../context/TrabajadorContext";
import { Fichaje } from "../../src/models/fichajes";
import { Horario } from "../../src/models/horarios";
import { Estado } from "../../src/models/trabajadores";
import {
  crearFichaje,
  obtenerFichajesEmpresaTrabajador,
} from "../../src/services/fichajesService";
import { obtenerHorarioTrabajadorEmpresa } from "../../src/services/horariosService";
import { getUltimoFichajeTrabajador } from "../../src/services/trabajadoresService";

export default function HomeScreen() {
  const { trabajadorActual, empresaSeleccionada } = useTrabajador();
  const [horario, setHorario] = useState<Horario | null>(null);
  const [ultimoFichaje, setUltimoFichaje] = useState<Fichaje | null>(null);

  const handleFichar = useMemo(() => {
    return (tipo: "entrada" | "salida" | "descanso" | "horas_extra") => {
      if (!trabajadorActual?.id || !empresaSeleccionada?.id) return;

      try {
        // Forzamos la espera de la creación en BD/API
        crearFichaje(trabajadorActual.id, empresaSeleccionada.id, tipo);
      } catch (error) {
        console.error("Error al fichar:", error);
      }
    };
  }, [trabajadorActual?.id, empresaSeleccionada?.id]);

  useEffect(() => {
    async function cargarHorario() {
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

  useEffect(() => {
    async function cargarUltimoFichaje() {
      if (trabajadorActual?.id) {
        const fichaje = getUltimoFichajeTrabajador(
          trabajadorActual.id,
          empresaSeleccionada?.id || 0,
        );
        setUltimoFichaje(fichaje);
      }
    }
    cargarUltimoFichaje();
  }, [trabajadorActual?.id, empresaSeleccionada?.id]);

  const horasTrabajadas = useMemo(() => {
    if (!trabajadorActual?.id) return 0;

    const fichajesTrabajador = obtenerFichajesEmpresaTrabajador(
      trabajadorActual.id,
      empresaSeleccionada?.id || 0,
    );

    const ultimaEntrada = fichajesTrabajador
      .filter((f) => f.tipo === "entrada")
      .pop();

    if (!ultimaEntrada) return 0;

    // Asegúrate de que fecha_hora sea un objeto Date válido
    const fechaEntrada = new Date(ultimaEntrada.fecha_hora);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fechaEntrada.getTime();

    return Math.floor(diffMs / (1000 * 60 * 60));
  }, [trabajadorActual?.id, empresaSeleccionada?.id]);
  // // Añadimos ultimoFichaje para que se actualice al pulsar el botón

  const formatearHora = (fechaInput: any) => {
    if (!fechaInput) return "00:00";

    // Convierte el input a objeto Date por si viene como String desde la API
    const d = new Date(fechaInput);

    // Agrega un cero a la izquierda si el número es menor de 10 (ej: "09:05")
    const horas = String(d.getHours()).padStart(2, "0");
    const minutos = String(d.getMinutes()).padStart(2, "0");

    return `${horas}:${minutos}`;
  };

  const tieneDatos = !!(empresaSeleccionada?.id && trabajadorActual?.id);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
    >
      {tieneDatos ? (
        <>
          <ThemedView style={styles.stepContainer}>
            <ThemedView style={styles.infoCard}>
              <ThemedText type="subtitle">
                Hola {trabajadorActual?.nombre || "Usuario"} <HelloWave />
              </ThemedText>
              <ThemedText type="subtitle">
                {"\n"}[ {empresaSeleccionada?.nombre || "Empresa"} ]
              </ThemedText>

              <ThemedText type="subtitle">
                Horario: {formatearHora(horario?.hora_entrada1)} a{" "}
                {formatearHora(horario?.hora_salida1)}
                {
                  <>
                    {" "}
                    y {formatearHora(horario?.hora_entrada2)} a{" "}
                    {formatearHora(horario?.hora_salida2)}
                  </>
                }
              </ThemedText>
              <ThemedText type="subtitle">
                {"\n"}·{" "}
                {
                  Estado[
                    Number.parseInt(trabajadorActual?.estado?.toString() || "0")
                  ]
                }{" "}
                ·
              </ThemedText>
              <ThemedText type="subtitle">
                {`\nTiempo trabajado hoy\n${horasTrabajadas}`}
              </ThemedText>

              <ThemedText type="subtitle">
                {`\nÚltimo fichaje ${ultimoFichaje ? "\n" + ultimoFichaje.tipo.toUpperCase() : ""}\n${ultimoFichaje?.fecha ? new Date(ultimoFichaje.fecha).toLocaleString() : "No hay fichajes aún"}`}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.stepContainer}>
            <ThemedView style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonFichar}
                onPress={() => handleFichar("entrada")}
              >
                <Text style={styles.textFichar}>Fichar Entrada</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonFichar}
                onPress={() => handleFichar("salida")}
              >
                <Text style={styles.textFichar}>Fichar Salida</Text>
              </TouchableOpacity>
            </ThemedView>

            <ThemedView style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonFichar}
                onPress={() => handleFichar("descanso")}
              >
                <Text style={styles.textFichar}>Fichar Descanso</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonFichar}
                onPress={() => handleFichar("horas_extra")}
              >
                <Text style={styles.textFichar}>Horas Extra</Text>
              </TouchableOpacity>
            </ThemedView>

            <Link href="../(protected)/empresas" asChild>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.textFichar}>Cambiar de Empresa</Text>
              </TouchableOpacity>
            </Link>
          </ThemedView>
        </>
      ) : (
        <ThemedView style={styles.infoContainer}>
          <ThemedText style={styles.infotitle} type="subtitle">
            Inicia sesión y selecciona una empresa para ver tu horario y poder
            fichar.
          </ThemedText>

          <Link href="../(protected)/empresas" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.textFichar}>Seleccionar Empresa</Text>
            </TouchableOpacity>
          </Link>
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  infotitle: {
    color: "#38565a",
    fontSize: 18,
    textAlign: "center",
  },
  stepContainer: {
    backgroundColor: "transparent",
  },
  buttonRow: {
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
    marginHorizontal: 10,
    gap: 10,
    width: "100%",
  },
  button: {
    backgroundColor: "#38565a",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    flex: 1,
    margin: 10,
  },
  buttonFichar: {
    backgroundColor: "#38565a",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },
  textFichar: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "#38565a",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#B2EBF2",
    margin: 5,
  },
  infoContainer: {
    backgroundColor: "transparent",
    gap: 8,
    marginBottom: 8,
    padding: 15,
    alignItems: "center",
  },
});
