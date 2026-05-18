import React from "react";
import { StyleSheet, View } from "react-native";
import { useEstadoFichaje } from "../hooks/useCurrentTimer";
import { ThemedText } from "./themed-text";

const ESTADO_VISUAL = {
  fuera: {
    icon: "●",
    label: "Sin actividad",
    color: "#64748B",
    background: "#F1F5F9",
  },
  trabajando: {
    icon: "●",
    label: "Trabajando",
    color: "#16A34A",
    background: "#F0FDF4",
  },
  descanso: {
    icon: "●",
    label: "En descanso",
    color: "#F59E0B",
    background: "#FFFBEB",
  },
};

export const EstadoActualCard = () => {
  const { estado, horaUltimo } = useEstadoFichaje();
  const visual = ESTADO_VISUAL[estado as keyof typeof ESTADO_VISUAL];

  return (
    <View style={[styles.card, { backgroundColor: visual.background }]}>
      <View style={styles.contenedor}>
        <ThemedText style={[styles.icon, { color: visual.color }]}>
          {visual.icon}
        </ThemedText>
        <View style={styles.textos}>
          <ThemedText style={[styles.label, { color: visual.color }]}>
            {visual.label}
          </ThemedText>
          {horaUltimo && (
            <ThemedText style={styles.hora}>Desde las {horaUltimo}</ThemedText>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  contenedor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    fontSize: 24,
  },
  textos: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  hora: {
    fontSize: 14,
    color: "#64748B",
  },
});
