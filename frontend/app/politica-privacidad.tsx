import { ThemedText } from "@/src/shared/components/ThemedText";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

export default function PoliticaPrivacidadScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <ThemedText style={styles.title}>Política de Privacidad</ThemedText>
        <ThemedText style={styles.subtitle}>
          Información legal sobre el control horario
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>
          1. Responsable del Tratamiento
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          La empresa titular de la plataforma es la responsable del tratamiento
          de los datos personales obtenidos a través de la aplicación de control
          horario (Fichapp).
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>
          2. Finalidad del Tratamiento
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          Los registros de jornada (entradas, salidas, pausas) y las firmas
          asociadas se recopilan exclusivamente para cumplir con la obligación
          legal de registro horario establecida en la normativa laboral vigente,
          así como para la gestión interna de recursos humanos.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>
          3. Conservación de los Datos
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          Los datos de los fichajes se conservarán durante el período legal
          exigido de 4 años, estando accesibles para los trabajadores, la
          empresa y la Inspección de Trabajo cuando sea requerido.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>
          4. Derechos de los Usuarios
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          Los usuarios pueden ejercer sus derechos de acceso, rectificación y
          supresión de sus datos dirigiéndose al departamento de administración
          o recursos humanos de su empresa.
        </ThemedText>

        <Pressable
          onPress={() => router.push("/")}
          style={{ alignSelf: "center", marginTop: 20 }}
        >
          <ThemedText
            style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}
          >
            Vuelve al{" "}
            <ThemedText style={{ color: "#2563EB", fontWeight: "700" }}>
              Inicio de Sesión
            </ThemedText>
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0F172A",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 600,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginVertical: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
});
