import React from "react";
import { StyleSheet, View } from "react-native";

export default function VideoBackground() {
  // Retornamos un contenedor oscuro provisional para asegurar el arranque
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0f172a" }]} />
  );
}
