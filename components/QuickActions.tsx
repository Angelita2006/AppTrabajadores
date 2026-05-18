import React from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useTrabajador } from "../context/TrabajadorContext";
import { useEstadoFichaje } from "../hooks/useCurrentTimer";
import { crearFichaje } from "../src/services/fichajesService";
import { useFichajeStore } from "../store/useFichajeStore";
import { ThemedText } from "./themed-text";

type QuickAction = {
  label: string;
  icon: string;
  tipo: "descanso" | "fin_descanso";
  color: string;
};

const ACCIONES_QUICK: Record<
  "trabajando" | "descanso" | "fuera",
  QuickAction[]
> = {
  trabajando: [
    {
      label: "Iniciar descanso",
      icon: "☕",
      tipo: "descanso",
      color: "#F59E0B",
    },
  ],
  descanso: [
    {
      label: "Fin descanso",
      icon: "🔄",
      tipo: "fin_descanso",
      color: "#16A34A",
    },
  ],
  fuera: [],
};

export const QuickActions = () => {
  const { estado } = useEstadoFichaje();
  const empresaId = useFichajeStore((s) => s.empresaId);
  const { trabajadorActual } = useTrabajador();

  const acciones = ACCIONES_QUICK[estado] || [];

  if (acciones.length === 0) return null;

  const handleAccion = (tipo: "descanso" | "fin_descanso") => {
    if (!trabajadorActual) return;

    try {
      const tipoFichaje = tipo === "fin_descanso" ? "entrada" : tipo;
      crearFichaje(trabajadorActual.id, empresaId, tipoFichaje);
      useFichajeStore.getState().cargarFichajesToday();

      Alert.alert(
        "Éxito",
        `${tipo === "descanso" ? "Descanso" : "Fin de descanso"} registrado`,
      );
    } catch (error) {
      Alert.alert("Error", "No se pudo registrar la acción");
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>Acciones rápidas</ThemedText>
      <View style={styles.botones}>
        {acciones.map((accion, index) => (
          <Pressable
            key={index}
            style={[styles.boton, { borderColor: accion.color }]}
            onPress={() => handleAccion(accion.tipo)}
          >
            <ThemedText style={styles.icon}>{accion.icon}</ThemedText>
            <ThemedText style={[styles.texto, { color: accion.color }]}>
              {accion.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 10,
  },
  botones: {
    flexDirection: "row",
    gap: 10,
  },
  boton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: "#F8FAFC",
  },
  icon: {
    fontSize: 16,
  },
  texto: {
    fontSize: 12,
    fontWeight: "600",
  },
});
