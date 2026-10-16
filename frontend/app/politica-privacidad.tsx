import { ThemedText } from "@/src/shared/components/ThemedText";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Colors } from "../src/constants/theme";
import { useColorScheme } from "../src/hooks/use-color-scheme";

export default function PoliticaPrivacidadScreen() {
  const theme = useColorScheme();
  const colors = Colors[theme];

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Cabecera con Logotipo y Branding unificado */}
        <View style={styles.headerContenedor}>
          <View style={styles.logoBranding}>
            <Image
              source={require("../assets/icons/logo.png")}
              style={styles.logoImage}
              resizeMode="cover"
              accessibilityLabel="Logotipo de Fichapp"
            />
          </View>
          <ThemedText style={styles.mainTitle}>FICHAPP</ThemedText>
          <ThemedText style={styles.subtitle}>
            Portal de Control Horario
          </ThemedText>
        </View>

        <ThemedText style={styles.title}>Política de Privacidad</ThemedText>
        <ThemedText style={styles.subtitleCard}>
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
          style={{ alignSelf: "center", marginTop: 24 }}
        >
          <ThemedText
            style={{ fontSize: 13, color: "#64748B", textAlign: "center" }}
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
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    marginVertical: 20,
    ...Platform.select({
      web: { boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.1)" } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  headerContenedor: {
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 16,
  },
  logoBranding: {
    width: 80,
    height: 80,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 4,
  },
  subtitleCard: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
});
