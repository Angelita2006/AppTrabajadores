import {
  confirmarCambioPassword,
  solicitarCodigoRecuperacion,
} from "@/src/modules/another-services/services";
import LottieBackground from "@/src/shared/ui/LottieBackground";
import VideoBackground from "@/src/shared/ui/VideoBackground";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ThemedText } from "../../src/shared/components/themed-text";
import { IconSymbol } from "../../src/shared/ui/icon-symbol";

export default function RecuperarPasswordScreen() {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2>(1); // 1 = Pedir Email, 2 = Validar Código y Cambiar Password

  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [isObscured, setIsObscured] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [mostrarFondo, setMostrarVideo] = useState(false);

  // Inicializamos en 0 para la animación de entrada suave
  const opacidadTarjeta = useSharedValue(0);

  useEffect(() => {
    // Forzamos a Reanimated a despertar el componente al cargar la vista
    opacidadTarjeta.value = withTiming(1, { duration: 500 });

    // Diagnóstico: Retardamos un ciclo corto el montaje del video para evitar choques con el render inicial
    const timer = setTimeout(() => {
      setMostrarVideo(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [opacidadTarjeta]);

  const handleSolicitarCodigo = async () => {
    if (!email.includes("@")) {
      if (Platform.OS === "web") {
        alert(
          "Formato Inválido: Por favor, introduce una dirección de correo electrónico válida.",
        );
      } else {
        Alert.alert(
          "Formato Inválido",
          "Por favor, introduce una dirección de correo electrónico válida.",
        );
      }
      return;
    }

    try {
      setCargando(true);
      await solicitarCodigoRecuperacion(email);

      // Transición animada de la tarjeta hacia el paso 2
      opacidadTarjeta.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(setPaso)(2);
        opacidadTarjeta.value = withTiming(1, { duration: 300 });
      });

      if (Platform.OS === "web") {
        alert(
          "Código Enviado: Hemos enviado un código de verificación de 6 dígitos a tu bandeja de entrada.",
        );
      } else {
        Alert.alert(
          "Código Enviado",
          "Hemos enviado un código de verificación de 6 dígitos a tu bandeja de entrada.",
        );
      }
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      if (Platform.OS === "web") {
        alert(`Error: ${mensajeAmigable}`);
      } else {
        Alert.alert("Error", mensajeAmigable);
      }
    } finally {
      setCargando(false);
    }
  };

  const handleRestablecerPassword = async () => {
    if (codigo.length !== 6 || nuevaPassword.length < 6) {
      if (Platform.OS === "web") {
        alert(
          "Datos Incorrectos: El código requiere 6 dígitos y la contraseña al menos 6 caracteres.",
        );
      } else {
        Alert.alert(
          "Datos Incorrectos",
          "El código requiere 6 dígitos y la contraseña al menos 6 caracteres.",
        );
      }
      return;
    }

    try {
      setCargando(true);
      await confirmarCambioPassword({
        email: email,
        codigo_verificacion: codigo,
        nueva_password: nuevaPassword,
      });

      Alert.alert(
        "Éxito",
        "Tu contraseña ha sido actualizada. Ya puedes ingresar al sistema.",
        [{ text: "Ir al Login", onPress: () => router.replace("/") }],
      );
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      if (Platform.OS === "web") {
        alert(`Fallo de Validación: ${mensajeAmigable}`);
      } else {
        Alert.alert("Fallo de Validación", mensajeAmigable);
      }
    } finally {
      setCargando(false);
    }
  };

  const estiloTarjetaAnimada = useAnimatedStyle(() => {
    // Calculamos la traslación en base a la opacidad actual de forma lineal
    const translateY = (1 - opacidadTarjeta.value) * 40;

    return {
      opacity: opacidadTarjeta.value,
      transform: [{ translateY }],
    };
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Fondo condicional: Video para Web, Lottie para Android/Nativo */}
      {mostrarFondo &&
        (Platform.OS === "web" ? <VideoBackground /> : <LottieBackground />)}

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        bounces={false}
      >
        <Animated.View style={[styles.loginCard, estiloTarjetaAnimada]}>
          <View style={styles.headerContenedor}>
            <View style={styles.logoBranding}>
              <IconSymbol name="lock" size={26} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.mainTitle}>Recuperación</ThemedText>
            <ThemedText style={styles.subtitle}>
              {paso === 1
                ? "Restablece el acceso a tu cuenta"
                : "Introduce el código de verificación"}
            </ThemedText>
          </View>

          {paso === 1 ? (
            // ==========================================
            // ASISTENTE PASO 1: SOLICITAR EMAIL
            // ==========================================
            <View style={styles.formularioWidth}>
              <View style={styles.field}>
                <ThemedText style={styles.label}>
                  Correo de recuperación
                </ThemedText>
                <View style={styles.inputWrapper}>
                  <IconSymbol
                    name="mail"
                    size={20}
                    color="#94A3B8"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    style={styles.inputContainer}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="nombre@empresa.com"
                    placeholderTextColor="#94A3B8"
                    editable={!cargando}
                  />
                </View>
              </View>

              <Pressable
                style={[
                  styles.primaryButton,
                  cargando && styles.buttonDisabled,
                ]}
                onPress={handleSolicitarCodigo}
                disabled={cargando}
              >
                {cargando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.buttonText}>
                    Enviar Código Seguro
                  </ThemedText>
                )}
              </Pressable>
            </View>
          ) : (
            // ==========================================
            // ASISTENTE PASO 2: INTRODUCIR CÓDIGO Y NUEVA PASSWORD
            // ==========================================
            <View style={styles.formularioWidth}>
              <View style={styles.field}>
                <ThemedText style={styles.label}>
                  Código de 6 dígitos
                </ThemedText>
                <View style={styles.inputWrapper}>
                  <IconSymbol
                    name="lock"
                    size={20}
                    color="#94A3B8"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={codigo}
                    onChangeText={setCodigo}
                    style={styles.inputContainer}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="Introduce el código"
                    placeholderTextColor="#94A3B8"
                    editable={!cargando}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <ThemedText style={styles.label}>Nueva Contraseña</ThemedText>
                <View style={styles.inputWrapper}>
                  <IconSymbol
                    name="lock"
                    size={20}
                    color="#94A3B8"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={nuevaPassword}
                    onChangeText={setNuevaPassword}
                    secureTextEntry={isObscured}
                    style={styles.inputContainer}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#94A3B8"
                    editable={!cargando}
                  />
                  <Pressable
                    onPress={() => setIsObscured(!isObscured)}
                    style={styles.eyeButton}
                  >
                    <IconSymbol
                      name={isObscured ? "visibility-off" : "visibility"}
                      size={22}
                      color="#64748B"
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={[
                  styles.primaryButton,
                  styles.confirmButton,
                  cargando && styles.buttonDisabled,
                ]}
                onPress={handleRestablecerPassword}
                disabled={cargando}
              >
                {cargando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.buttonText}>
                    Confirmar Cambio
                  </ThemedText>
                )}
              </Pressable>
            </View>
          )}

          <Pressable
            onPress={() => router.replace("/")}
            style={styles.linkVolver}
          >
            <ThemedText style={styles.linkTexto}>
              Volver al inicio de sesión
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  loginCard: {
    width: "90%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    ...Platform.select({
      web: {
        boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.1)",
      },
      default: {
        boxShadow: "0px 4px 12px 0px rgba(0, 0, 0, 0.1)",
        elevation: 8,
      },
    }),
  },
  headerContenedor: { alignItems: "center", marginBottom: 24 },
  logoBranding: {
    width: 52,
    height: 52,
    backgroundColor: "#EA580C",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  formularioWidth: { width: "100%" },
  field: { marginBottom: 18, width: "100%" },
  label: { fontSize: 13, fontWeight: "700", color: "#1E293B", marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  inputContainer: {
    flex: 1,
    height: "100%",
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "500",
  },
  eyeButton: { padding: 8 },
  primaryButton: {
    width: "100%",
    height: 52,
    backgroundColor: "#EA580C",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  confirmButton: { backgroundColor: "#16A34A" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  linkVolver: { marginTop: 24 },
  linkTexto: { fontSize: 14, color: "#2563EB", fontWeight: "700" },
});
