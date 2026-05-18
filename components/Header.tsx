import React from "react";
import { StyleSheet, View } from "react-native";
import { useTrabajador } from "../context/TrabajadorContext";
import { ThemedText } from "./themed-text";

export const Header = () => {
  const { trabajadorActual } = useTrabajador();

  const nombre = trabajadorActual?.nombre?.split(" ")[0] || "Trabajador";

  return (
    <View style={styles.container}>
      <ThemedText style={styles.saludo}>Hola {nombre} 👋</ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  saludo: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },
});
