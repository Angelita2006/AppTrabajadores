// app/mobile/app/(authentication)/registro.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { obtenerEmpresaPorCif } from "../../src/modules/empresas/api/services";
import { Empresa } from "../../src/modules/empresas/types/empresa";
import { crearTrabajador } from "../../src/modules/trabajadores/api/services";
import { ThemedText } from "../../src/shared/components/themed-text";
import VideoBackground from "../../src/shared/ui/VideoBackground";
import { IconSymbol } from "../../src/shared/ui/icon-symbol";

export default function RegistroScreen() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [isObscured, setIsObscured] = useState(true);

  // Estados del Formulario Multiempresa adaptados a tu backend de PostgreSQL
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [nifNie, setNifNie] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [empresaCif, setEmpresaCif] = useState(""); // Código UUID del Tenant entregado por la empresa

  // Estados de Validación Visual
  const [errorEmail, setErrorEmail] = useState(false);
  const [errorPassword, setErrorPassword] = useState(false);

  const validarCampos = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const esEmailValido = emailRegex.test(email);
    const esPasswordValido = password.length >= 6;
    const camposCompletos =
      nombre.trim() && apellidos.trim() && nifNie.trim() && empresaCif.trim();

    setErrorEmail(!esEmailValido);
    setErrorPassword(!esPasswordValido);

    if (!camposCompletos) {
      Alert.alert(
        "Campos Vacíos",
        "Por favor, rellena todos los parámetros obligatorios de tu contrato.",
      );
      return false;
    }

    return esEmailValido && esPasswordValido;
  };

  const handleRegistro = async () => {
    if (!validarCampos()) return;

    try {
      setCargando(true);
      const empresa: Empresa = await obtenerEmpresaPorCif(
        Number.parseInt(empresaCif),
      );
      // Dispara la petición hacia el endpoint POST /api/trabajadores de tu FastAPI
      await crearTrabajador({
        empresa_id: empresa.id.toString(),
        nif_nie: nifNie.trim().toUpperCase(),
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        email: email.trim().toLowerCase(),
      });

      Alert.alert(
        "Alta Consolidada",
        "Tu cuenta y tu expediente han sido registrados correctamente en PostgreSQL.",
        [{ text: "Ir al Acceso", onPress: () => router.replace("/") }],
      );
    } catch (error: any) {
      Alert.alert(
        "Fallo de Integridad",
        "El NIF/NIE o el Correo ya constan registrados, o el código UUID de la empresa es inválido.\n" +
          error,
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <VideoBackground />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        bounces={false}
      >
        <Animated.View style={styles.loginCard}>
          <View style={styles.headerContenedor}>
            <View style={styles.logoBranding}>
              <IconSymbol name="person" size={26} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.mainTitle}>Alta de Usuario</ThemedText>
            <ThemedText style={styles.subtitle}>
              Vincula tu perfil al control horario de tu empresa
            </ThemedText>
          </View>

          <View style={styles.formulario}>
            {/* Campo: Código de Empresa (Tenant) */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>CIF Único de Empresa</ThemedText>
              <View style={styles.inputWrapper}>
                <IconSymbol
                  name="briefcase.fill"
                  size={20}
                  color="#94A3B8"
                  style={styles.inputIcon}
                />
                <TextInput
                  value={empresaCif}
                  onChangeText={setEmpresaCif}
                  style={styles.inputContainer}
                  autoCapitalize="none"
                  placeholder="Introduce el CIF de tu corporación"
                  placeholderTextColor="#94A3B8"
                  editable={!cargando}
                />
              </View>
            </View>

            {/* Fila: Nombre y Apellidos */}
            <View style={styles.rowCampos}>
              <View style={[styles.field, { flex: 1 }]}>
                <ThemedText style={styles.label}>Nombre</ThemedText>
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  style={styles.inputPlano}
                  placeholder="Tu nombre"
                  placeholderTextColor="#94A3B8"
                  editable={!cargando}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <ThemedText style={styles.label}>Apellidos</ThemedText>
                <TextInput
                  value={apellidos}
                  onChangeText={setApellidos}
                  style={styles.inputPlano}
                  placeholder="Tus apellidos"
                  placeholderTextColor="#94A3B8"
                  editable={!cargando}
                />
              </View>
            </View>

            {/* Campo: NIF / NIE */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>
                Identificación (NIF / NIE)
              </ThemedText>
              <View style={styles.inputWrapper}>
                <IconSymbol
                  name="group"
                  size={20}
                  color="#94A3B8"
                  style={styles.inputIcon}
                />
                <TextInput
                  value={nifNie}
                  onChangeText={setNifNie}
                  style={styles.inputContainer}
                  autoCapitalize="characters"
                  placeholder="Ej: 12345678X"
                  placeholderTextColor="#94A3B8"
                  editable={!cargando}
                />
              </View>
            </View>

            {/* Campo: Email */}
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
                  placeholder="tuemail@empresa.com"
                  placeholderTextColor="#94A3B8"
                  editable={!cargando}
                />
              </View>
            </View>

            {/* Campo: Contraseña */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>Contraseña de Acceso</ThemedText>
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
              style={[styles.primaryButton, cargando && styles.buttonDisabled]}
              onPress={handleRegistro}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.buttonText}>
                  Completar Registro
                </ThemedText>
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.replace("/")}
            style={styles.linkVolver}
          >
            <ThemedText style={styles.linkTexto}>
              ¿Ya tienes cuenta? Inicia Sesión
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
    // 1. Ocupa el 90% en móviles, pero nunca superará los 420px en pantallas grandes (Web/Tablets)
    width: "90%",
    maxWidth: 420,

    // 2. Centra la tarjeta horizontalmente si el contenedor padre es más ancho que el maxWidth
    alignSelf: "center",

    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",

    // Filtro inteligente para aplicar sombras seguras según la plataforma
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
  headerContenedor: { alignItems: "center", marginBottom: 20 },
  logoBranding: {
    width: 52,
    height: 52,
    backgroundColor: "#2563EB",
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
  },
  formulario: { width: "100%" },
  field: { marginBottom: 14, width: "100%" },
  rowCampos: { flexDirection: "row", gap: 10, width: "100%" },
  label: { fontSize: 13, fontWeight: "700", color: "#1E293B", marginBottom: 6 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    height: 48,
  },
  inputPlano: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    height: 48,
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "500",
  },
  inputWrapperError: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
  inputIcon: { marginRight: 10 },
  inputContainer: {
    flex: 1,
    height: "100%",
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "500",
  },
  eyeButton: { padding: 8 },
  primaryButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  linkVolver: { marginTop: 20 },
  linkTexto: { fontSize: 14, color: "#2563EB", fontWeight: "700" },
});
