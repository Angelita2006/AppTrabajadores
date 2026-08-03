import { registrarOrganizacionCompleta } from "@/src/modules/another-services/services";
import { ThemedText } from "@/src/shared/components/themed-text";
import LottieBackground from "@/src/shared/ui/LottieBackground";
import VideoBackground from "@/src/shared/ui/VideoBackground";
import { IconSymbol } from "@/src/shared/ui/icon-symbol";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export default function RegistroOrganizacionScreen() {
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [cif, setCif] = useState("");
  const [nombreAdmin, setNombreAdmin] = useState("");
  const [apellidosAdmin, setApellidosAdmin] = useState("");
  const [emailAdmin, setEmailAdmin] = useState("");
  const [password, setPassword] = useState("");

  const [cargando, setCargando] = useState(false);
  const [isObscured, setIsObscured] = useState(true);
  const [mostrarFondo, setMostrarVideo] = useState(false);

  // Referencias para el manejo del foco entre inputs
  const cifRef = useRef<TextInput>(null);
  const nombreAdminRef = useRef<TextInput>(null);
  const apellidosAdminRef = useRef<TextInput>(null);
  const emailAdminRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Estados de error visual
  const [errorNombre, setErrorNombre] = useState(false);
  const [errorCif, setErrorCif] = useState(false);
  const [errorEmail, setErrorEmail] = useState(false);
  const [errorPassword, setErrorPassword] = useState(false);

  const opacidadTarjeta = useSharedValue(0);

  useEffect(() => {
    opacidadTarjeta.value = withTiming(1, { duration: 500 });

    // Retardo breve para evitar choques con la navegación inicial
    const timer = setTimeout(() => {
      setMostrarVideo(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [opacidadTarjeta]);

  const validarFormulario = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const esNombreValido = nombreEmpresa.trim().length > 2;
    const esCifValido = cif.trim().length >= 8;
    const esEmailValido = emailRegex.test(emailAdmin);
    const esPasswordValido = password.length >= 6;

    setErrorNombre(!esNombreValido);
    setErrorCif(!esCifValido);
    setErrorEmail(!esEmailValido);
    setErrorPassword(!esPasswordValido);

    return esNombreValido && esCifValido && esEmailValido && esPasswordValido;
  };

  const handleRegistroOrganizacion = async () => {
    if (!validarFormulario()) return;

    try {
      setCargando(true);

      // Llamada encadenada al backend usando tu instancia de Axios unificada
      await registrarOrganizacionCompleta({
        nombre_comercial: nombreEmpresa,
        razon_social: nombreEmpresa, // Se usa como fallback inicial
        cif: cif.trim(),
        email: emailAdmin.trim(),
        password_raw: password,
        nombre_admin: nombreAdmin.trim() || "Admin",
        apellidos_admin: apellidosAdmin.trim() || nombreEmpresa,
      });

      const mensajeExito =
        "Organización, expediente laboral y cuenta administradora configurados con éxito.";
      if (Platform.OS === "web") {
        alert(mensajeExito);
      } else {
        Alert.alert("¡Alta Exitosa!", mensajeExito);
      }

      router.replace("/");
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      if (Platform.OS === "web") {
        alert(`Error de Registro: ${mensajeAmigable}`);
      } else {
        Alert.alert("Error de Registro", mensajeAmigable);
      }
    } finally {
      setCargando(false);
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
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.registerCard, estiloTarjetaAnimada]}>
          {/* HEADER */}
          <View style={styles.headerContenedor}>
            <View style={styles.logoBranding}>
              <IconSymbol name="business" size={28} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.mainTitle}>
              Registro de Organización
            </ThemedText>
          </View>

          {/* INPUT: NOMBRE DE LA EMPRESA */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>
              Nombre Comercial / Razón Social
            </ThemedText>
            <View
              style={[
                styles.inputWrapper,
                errorNombre && styles.inputWrapperError,
              ]}
            >
              <IconSymbol
                name="corporate-fare"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                value={nombreEmpresa}
                onChangeText={(text) => {
                  setNombreEmpresa(text);
                  if (errorNombre) setErrorNombre(false);
                }}
                style={styles.inputContainer}
                placeholder="Ej. Mi Empresa S.L."
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => cifRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errorNombre && (
              <ThemedText style={styles.errorText}>
                El nombre debe tener más de 2 caracteres.
              </ThemedText>
            )}
          </View>

          {/* INPUT: CIF / NIF */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>CIF / NIF Organización</ThemedText>
            <View
              style={[
                styles.inputWrapper,
                errorCif && styles.inputWrapperError,
              ]}
            >
              <IconSymbol
                name="badge"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={cifRef}
                value={cif}
                onChangeText={(text) => {
                  setCif(text.toUpperCase());
                  if (errorCif) setErrorCif(false);
                }}
                style={styles.inputContainer}
                autoCapitalize="characters"
                placeholder="Ej. B12345678"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => nombreAdminRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errorCif && (
              <ThemedText style={styles.errorText}>
                Introduce un CIF/NIF válido.
              </ThemedText>
            )}
          </View>

          <View style={styles.divisor} />
          <ThemedText style={styles.seccionSubtitulo}>
            Datos del Administrador
          </ThemedText>

          {/* INPUT: NOMBRE ADMIN */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Nombre</ThemedText>
            <View style={styles.inputWrapper}>
              <IconSymbol
                name="person"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={nombreAdminRef}
                value={nombreAdmin}
                onChangeText={setNombreAdmin}
                style={styles.inputContainer}
                placeholder="Nombre del gestor"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => apellidosAdminRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* INPUT: APELLIDOS ADMIN */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Apellidos</ThemedText>
            <View style={styles.inputWrapper}>
              <IconSymbol
                name="person"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={apellidosAdminRef}
                value={apellidosAdmin}
                onChangeText={setApellidosAdmin}
                style={styles.inputContainer}
                placeholder="Apellidos del gestor"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => emailAdminRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* INPUT: EMAIL ADMIN */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>
              Correo Electrónico Corporativo
            </ThemedText>
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
                ref={emailAdminRef}
                value={emailAdmin}
                onChangeText={(text) => {
                  setEmailAdmin(text);
                  if (errorEmail) setErrorEmail(false);
                }}
                style={styles.inputContainer}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="admin@empresa.com"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errorEmail && (
              <ThemedText style={styles.errorText}>
                Introduce un email válido.
              </ThemedText>
            )}
          </View>

          {/* INPUT: PASSWORD */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Contraseña maestra</ThemedText>
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
                ref={passwordRef}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorPassword) setErrorPassword(false);
                }}
                secureTextEntry={isObscured}
                style={styles.inputContainer}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="done"
                onSubmitEditing={handleRegistroOrganizacion}
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
          </View>

          {/* BOTÓN DE ACCIÓN PRINCIPAL */}
          <Pressable
            style={[
              styles.primaryButton,
              cargando && styles.primaryButtonDisabled,
            ]}
            onPress={handleRegistroOrganizacion}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.buttonText}>
                Registrar Empresa
              </ThemedText>
            )}
          </Pressable>

          {/* VOLVER AL LOGIN */}
          <Pressable
            onPress={() => router.replace("/")}
            style={{ alignSelf: "center", marginTop: 20 }}
          >
            <ThemedText
              style={{ fontSize: 13, color: "#64748B", fontWeight: "700" }}
            >
              ¿Ya tienes cuenta?{" "}
              <ThemedText style={{ color: "#2563EB" }}>
                Inicia Sesión
              </ThemedText>
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
    paddingVertical: 72,
    paddingBottom: 80,
  },
  registerCard: {
    width: "90%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    ...Platform.select({
      web: {
        maxWidth: 620,
        boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.1)",
      } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  headerContenedor: { alignItems: "center", marginBottom: 24 },
  logoBranding: {
    width: 56,
    height: 56,
    backgroundColor: "#EA580C",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: { fontSize: 14, fontWeight: "500", color: "#64748B", marginTop: 4 },
  field: { marginBottom: 16, width: "100%" },
  label: { fontSize: 13, fontWeight: "700", color: "#1E293B", marginBottom: 6 },
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
    backgroundColor: "#EA580C",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  primaryButtonDisabled: { backgroundColor: "#FDBA74" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    paddingHorizontal: 4,
  },
  divisor: {
    height: 1,
    backgroundColor: "#E2E8F0",
    width: "100%",
    marginVertical: 16,
  },
  seccionSubtitulo: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
