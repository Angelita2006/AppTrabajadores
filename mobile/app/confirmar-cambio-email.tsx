import { confirmarCambioEmail } from "@/src/modules/usuarios/api/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "../src/shared/components/ThemedText";
import { AppScreen, Card } from "../src/shared/ui/AppSurface";
import { IconSymbol } from "../src/shared/ui/IconSymbol";

export default function ConfirmarCambioEmailScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  const [cargando, setCargando] = useState(true);
  const [exito, setExito] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");

  useEffect(() => {
    const procesarConfirmacion = async () => {
      if (!token) {
        setCargando(false);
        setErrorMensaje("No se ha proporcionado un token válido.");
        return;
      }

      try {
        // Llama a tu servicio backend que procesa el token de cambio de email
        await confirmarCambioEmail(token);
        setExito(true);
      } catch (error: any) {
        setErrorMensaje(
          error?.response?.data?.detail ||
            error.message ||
            "El enlace ha expirado o no es válido.",
        );
      } finally {
        setCargando(false);
      }
    };

    procesarConfirmacion();
  }, [token]);

  return (
    <AppScreen title="Cambio de Correo">
      <View style={styles.container}>
        <Card>
          {cargando ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#2563EB" />
              <ThemedText style={styles.title}>Validando enlace...</ThemedText>
              <ThemedText style={styles.subtitle}>
                Por favor espera mientras actualizamos tu correo electrónico.
              </ThemedText>
            </View>
          ) : exito ? (
            <View style={styles.centerContent}>
              <IconSymbol name="check-circle" size={48} color="#16A34A" />
              <ThemedText style={[styles.title, { color: "#16A34A" }]}>
                ¡Correo Actualizado!
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                Tu dirección de correo electrónico se ha modificado con éxito.
                Ya puedes iniciar sesión con tu nuevo email.
              </ThemedText>
              <Pressable
                style={styles.button}
                onPress={() => router.replace("/(tabs)/perfil")}
              >
                <ThemedText style={styles.buttonText}>
                  Ir a mi Perfil
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.centerContent}>
              <IconSymbol name="error" size={48} color="#DC2626" />
              <ThemedText style={[styles.title, { color: "#DC2626" }]}>
                No se pudo completar
              </ThemedText>
              <ThemedText style={styles.subtitle}>{errorMensaje}</ThemedText>
              <Pressable
                style={[styles.button, { backgroundColor: "#475569" }]}
                onPress={() => router.replace("/(tabs)/perfil")}
              >
                <ThemedText style={styles.buttonText}>
                  Volver al inicio
                </ThemedText>
              </Pressable>
            </View>
          )}
        </Card>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  centerContent: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
