import { obtenerEmpresaTrabajador } from "@/src/modules/trabajadores/api/services";
import { iniciarSesion } from "@/src/modules/usuarios/api/services";
import { NotificationService } from "@/src/notifications/NotificationService";
import { setAuthToken } from "@/src/service/api/api";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import LottieBackground from "@/src/shared/ui/Background.native";
import VideoBackground from "@/src/shared/ui/Background.web";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { obtenerEmpresa } from "../src/modules/empresas/api/services";
import { useSesion } from "../src/modules/usuarios/store/SesionContext";
import { ThemedText } from "../src/shared/components/ThemedText";
import { IconSymbol } from "../src/shared/ui/IconSymbol";

// Candado global para persistir el estado de autenticación entre renders
let isAuthenticatingGlobal = false;

export default function RootIndexScreen() {
  const {
    usuarioActual,
    setUsuarioActual,
    setEmpresaActual,
    cargandoSesionLocal,
  } = useSesion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordInputRef = useRef<TextInput | null>(null);
  const [isObscured, setIsObscured] = useState(true);
  const [cargando, setCargando] = useState(false);

  const [errorEmail, setErrorEmail] = useState(false);
  const [errorPassword, setErrorPassword] = useState(false);

  const { mostrarError } = useAppModal();

  const opacidadTarjeta = useSharedValue(0);

  useEffect(() => {
    if (usuarioActual?.id === "1") {
      setUsuarioActual(null);
    }
    opacidadTarjeta.value = 0;
    opacidadTarjeta.value = withTiming(1, { duration: 500 });
  }, [opacidadTarjeta, setUsuarioActual, usuarioActual]);

  useEffect(() => {
    const configurarNotificaciones = async () => {
      if (Platform.OS === "web") return;
      if (usuarioActual && !isAuthenticatingGlobal) {
        try {
          const permitido = await NotificationService.requestPermissions();
          if (permitido) {
            await NotificationService.programarAlarmasTurno(usuarioActual.id);
          }
        } catch (error: any) {
          mostrarError(
            "No se han podido configurar las notificaciones: " + error.message,
          );
        }
      }
    };

    configurarNotificaciones();
  }, [usuarioActual]);

  const validarFormulario = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const esEmailValido = emailRegex.test(email);
    const esPasswordValido = password.length >= 6;

    setErrorEmail(!esEmailValido);
    setErrorPassword(!esPasswordValido);
    return esEmailValido && esPasswordValido;
  };

  const handleLogin = async () => {
    if (!validarFormulario()) return;

    isAuthenticatingGlobal = true;
    try {
      setCargando(true);

      let respuestaLogin;
      try {
        respuestaLogin = await iniciarSesion(email, password);
      } catch (error: any) {
        mostrarError("Error al iniciar sesión: " + error.message);
        return;
      }

      if (!respuestaLogin) {
        mostrarError("No se pudo obtener respuesta del servidor.");
        return;
      }

      const { access_token, usuario } = respuestaLogin;
      setAuthToken(access_token);
      setUsuarioActual(usuario);

      if (usuario.tipo_usuario === "Admin_empresa" && usuario.empresa_id) {
        try {
          const empresa = await obtenerEmpresa(usuario.empresa_id);
          setEmpresaActual(empresa);
        } catch (error: any) {
          mostrarError(
            "No se pudieron cargar los datos de la empresa administradora: " +
              error.message,
          );
        }
      } else if (usuario.trabajador_id) {
        try {
          const empresaTrabajador = await obtenerEmpresaTrabajador(
            usuario.trabajador_id,
            access_token,
          );
          if (empresaTrabajador) {
            setEmpresaActual(empresaTrabajador);
          }
        } catch (error: any) {
          mostrarError(
            "No se pudieron cargar empresas del trabajador: " + error.message,
          );
        }
      }
    } catch (error: any) {
      mostrarError("Ha fallado el proceso de autenticación: " + error.message);
    } finally {
      setCargando(false);
      isAuthenticatingGlobal = false;
    }
  };

  const estiloTarjetaAnimada = useAnimatedStyle(() => {
    return {
      opacity: opacidadTarjeta.value,
      transform: [
        {
          translateY: withTiming(
            opacidadTarjeta.value * 0 + (1 - opacidadTarjeta.value) * 40,
          ),
        },
      ],
    };
  });

  const mostrarFondo = !cargandoSesionLocal && !usuarioActual;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {mostrarFondo &&
        (Platform.OS === "web" ? <VideoBackground /> : <LottieBackground />)}

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        bounces={false}
      >
        <Animated.View style={[styles.loginCard, estiloTarjetaAnimada]}>
          <View style={styles.headerContenedor}>
            <View style={styles.logoBranding}>
              <IconSymbol name="schedule" size={28} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.mainTitle}>FICHAPP</ThemedText>
            <ThemedText style={styles.subtitle}>
              Portal de Control Horario
            </ThemedText>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Correo Electrónico</ThemedText>
            <View
              style={[
                styles.inputWrapper,
                errorEmail && styles.inputWrapperError,
              ]}
            >
              <IconSymbol
                name="mail"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorEmail) setErrorEmail(false);
                }}
                style={styles.inputContainer}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="nombre@empresa.com"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>
            {errorEmail && (
              <ThemedText style={styles.errorText}>
                Introduce un email con formato válido.
              </ThemedText>
            )}
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Contraseña</ThemedText>
            <View
              style={[
                styles.inputWrapper,
                errorPassword && styles.inputWrapperError,
              ]}
            >
              <IconSymbol
                name="lock"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={passwordInputRef}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorPassword) setErrorPassword(false);
                }}
                secureTextEntry={isObscured}
                style={styles.inputContainer}
                placeholder="Introduce tu contraseña"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <Pressable
                onPress={() => setIsObscured(!isObscured)}
                style={styles.eyeButton}
                disabled={cargando}
              >
                <IconSymbol
                  name={isObscured ? "visibility-off" : "visibility"}
                  size={22}
                  color="#64748B"
                />
              </Pressable>
            </View>
            {errorPassword && (
              <ThemedText style={styles.errorText}>
                La contraseña requiere al menos 6 caracteres.
              </ThemedText>
            )}
            <Pressable
              onPress={() =>
                router.push("/(authentication)/recuperar-password")
              }
              style={{ alignSelf: "center", marginVertical: 16 }}
            >
              <ThemedText
                style={{ fontSize: 13, color: "#2563EB", fontWeight: "700" }}
              >
                ¿Has olvidado tu contraseña?
              </ThemedText>
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.primaryButton,
              cargando && styles.primaryButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.buttonText}>Iniciar Sesión</ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.push("/(authentication)/registro")}
            style={{ alignSelf: "center", marginVertical: 16 }}
          >
            <ThemedText
              style={{ fontSize: 13, color: "#64748B", fontWeight: "700" }}
            >
              ¿No tienes una cuenta?{" "}
              <ThemedText style={{ color: "#2563EB" }}>Regístrate</ThemedText>
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(authentication)/registro-empresa")}
            style={styles.organizationRegisterButton}
          >
            <IconSymbol
              name="business"
              size={16}
              color="#1E293B"
              style={{ marginRight: 6 }}
            />
            <ThemedText style={styles.organizationRegisterText}>
              Quiero registrar mi empresa
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(authentication)/politica-privacidad")}
            style={{ alignSelf: "center", marginTop: 20 }}
          >
            <ThemedText
              style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}
            >
              Al iniciar sesión, aceptas nuestra{" "}
              <ThemedText style={{ color: "#2563EB", fontWeight: "700" }}>
                Política de Privacidad
              </ThemedText>
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
    ...Platform.select({
      ios: {
        paddingBottom: 40,
      },
      android: {
        paddingBottom: 32,
      },
    }),
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
  headerContenedor: { alignItems: "center", marginBottom: 28 },
  logoBranding: {
    width: 56,
    height: 56,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 1.5,
  },
  subtitle: { fontSize: 14, fontWeight: "500", color: "#64748B", marginTop: 4 },
  field: { marginBottom: 20, width: "100%" },
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
  inputWrapperError: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
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
    backgroundColor: "#2563EB",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonDisabled: { backgroundColor: "#93C5FD" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  organizationRegisterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    padding: 10,
  },
  organizationRegisterText: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
  },
});
