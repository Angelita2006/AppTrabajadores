import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet } from "react-native";
import { crearFichaje } from "../../../modules/fichajes/api/fichajesService";
import {
  EstadoFichaje,
  useFichajeStore,
} from "../../../modules/fichajes/store/useFichajeStore";
import { useTrabajador } from "../../../modules/trabajadores/store/TrabajadorContext";
import { ThemedText } from "../../../shared/components/themed-text";

const ESTADO_CONFIG: Record<
  EstadoFichaje,
  {
    label: string;
    tipo: "entrada" | "salida" | "descanso" | "fin_descanso";
    backgroundColor: string;
    textColor: string;
  }
> = {
  fuera: {
    label: "Fichar Entrada",
    tipo: "entrada",
    backgroundColor: "#16A34A",
    textColor: "#FFFFFF",
  },
  trabajando: {
    label: "Fichar Salida",
    tipo: "salida",
    backgroundColor: "#DC2626",
    textColor: "#FFFFFF",
  },
  descanso: {
    label: "Finalizar Descanso",
    tipo: "fin_descanso",
    backgroundColor: "#F59E0B",
    textColor: "#FFFFFF",
  },
};

export const MainActionButton = () => {
  const [loading, setLoading] = useState(false);
  const estado = useFichajeStore((s) => s.estadoActual);
  const empresaId = useFichajeStore((s) => s.empresaId);
  const { trabajadorActual } = useTrabajador();

  const config = ESTADO_CONFIG[estado];

  const handlePress = async () => {
    if (!trabajadorActual) {
      Alert.alert("Error", "Inicia sesión primero");
      return;
    }

    if (!empresaId) {
      Alert.alert("Error", "Selecciona una empresa antes de fichar");
      return;
    }

    setLoading(true);
    try {
      await crearFichaje(trabajadorActual.id, empresaId, config.tipo);

      // Recargar estado
      await useFichajeStore.getState().cargarFichajesToday();

      Alert.alert(
        "Éxito",
        `${config.label.replace("Fichar ", "").replace("Finalizar ", "")} registrada a las ${new Date().toLocaleTimeString(
          "es-ES",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        )}`,
      );
    } catch (error) {
      Alert.alert("Error", "No se pudo registrar el fichaje");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={[
        styles.button,
        { backgroundColor: config.backgroundColor },
        loading && styles.buttonDisabled,
      ]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <ThemedText style={[styles.text, { color: config.textColor }]}>
          {config.label}
        </ThemedText>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});
