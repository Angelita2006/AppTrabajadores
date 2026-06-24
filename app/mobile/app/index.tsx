import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import {
  getUsuarioByEmailYPassword,
  obtenerEmpresasTrabajador,
} from "../src/modules/trabajadores/api/services";
import { useSesion } from "../src/modules/trabajadores/store/SesionContext";
import { ThemedText } from "../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../src/shared/ui/AppSurface";
import VideoBackground from "../src/shared/ui/VideoBackground";
import { IconSymbol } from "../src/shared/ui/icon-symbol";

const { width } = Dimensions.get("window");

export default function RootIndexScreen() {
  const {
    usuarioActual,
    setUsuarioActual,
    trabajadorActual,
    setEmpresas,
    setEmpresaSeleccionada,
    empresaSeleccionada,
  } = useSesion();

  const [email, setEmail] = useState("angelitagarciavalera@gmail.com");
  const [password, setPassword] = useState("password123");
  const [isObscured, setIsObscured] = useState(true);
  const [cargando, setCargando] = useState(false);

  const [errorEmail, setErrorEmail] = useState(false);
  const [errorPassword, setErrorPassword] = useState(false);

  const opacidadTarjeta = useSharedValue(0);

  useEffect(() => {
    if (usuarioActual?.id === "1") {
      setUsuarioActual(null);
    }
    opacidadTarjeta.value = 0;
    opacidadTarjeta.value = withTiming(1, { duration: 500 });
  }, [opacidadTarjeta, setUsuarioActual, usuarioActual]);

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

    try {
      setCargando(true);
      const usuarioSesion = await getUsuarioByEmailYPassword(email, password);
      const empresas = await obtenerEmpresasTrabajador(
        usuarioSesion.trabajador_id,
      );

      setUsuarioActual(usuarioSesion);
      setEmpresas(empresas);
      setEmpresaSeleccionada(empresas[0] ?? null);
    } catch (error) {
      Alert.alert(
        "Fallo de autenticación",
        "El correo electrónico o la contraseña introducidos son incorrectos o su cuenta está inactiva.\n" +
          error,
      );
    } finally {
      setCargando(false);
    }
  };

  const handleLogout = () => {
    setUsuarioActual(null);
    setEmpresas([]);
    setEmpresaSeleccionada(null);
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

  // ====================================================================
  // VISTA DE PERFIL (USUARIO LOGUEADO)
  // ====================================================================
  if (usuarioActual && trabajadorActual) {
    return (
      <AppScreen
        title="Mi Perfil"
        subtitle="Consulta la ficha técnica de tu expediente laboral operativo."
      >
        <Row>
          <StatCard
            label="Usuario"
            value={usuarioActual.nombre}
            tone="success"
          />
          <StatCard label="Rol Sistema" value={usuarioActual.tipo_usuario} />
          <StatCard
            label="Empresa Activa"
            value={empresaSeleccionada?.nombre ?? "Ninguna"}
          />
        </Row>

        <Animated.View style={estiloTarjetaAnimada}>
          <Card>
            <ThemedText style={styles.perfilTitle}>
              Ficha del Trabajador
            </ThemedText>
            <View style={styles.detailGrid}>
              <Detail
                label="Nombre Completo"
                value={`${trabajadorActual.nombre} ${trabajadorActual.apellidos}`}
              />
              <Detail
                label="Identificación (NIF/NIE)"
                value={trabajadorActual.nif_nie}
              />
              <Detail
                label="Fecha Alta Empresa"
                value={trabajadorActual.fecha_alta_empresa}
              />
              <Detail
                label="Número Seg. Social"
                value={
                  trabajadorActual.numero_seguridad_social ?? "No registrado"
                }
              />
              <Detail
                label="Teléfono de Contacto"
                value={trabajadorActual.telefono ?? "No registrado"}
              />
              <Detail label="Email de Acceso" value={usuarioActual.email} />
            </View>

            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <ThemedText style={styles.logoutButtonText}>
                Cerrar Sesión Activa
              </ThemedText>
            </Pressable>
          </Card>
        </Animated.View>
      </AppScreen>
    );
  }

  // ====================================================================
  // VISTA DE ACCESO (FORMULARIO DE LOGIN)
  // ====================================================================
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
            <Pressable
              onPress={() =>
                router.replace("/(authentication)/recuperar-password")
              }
              style={{
                alignSelf: "center",
                marginBottom: 16,
                marginTop: 16,
              }}
            >
              <ThemedText
                style={{ fontSize: 13, color: "#2563EB", fontWeight: "700" }}
              >
                ¿Has olvidado tu contraseña?
              </ThemedText>
            </Pressable>
            {errorPassword && (
              <ThemedText style={styles.errorText}>
                La contraseña requiere al menos 6 caracteres.
              </ThemedText>
            )}
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
          {/* <ThemedText style={styles.helpText}>
            Conexión encriptada con el servidor de la organización.
          </ThemedText> */}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value ?? "-"}</ThemedText>
    </View>
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
    width: width * 0.9,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",

    // Filtro inteligente para aplicar sombras seguras según la plataforma
    ...Platform.select({
      web: {
        // En navegadores web usamos la directiva estándar recomendada por la advertencia
        boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.1)",
      },
      default: {
        // En dispositivos móviles (Pixel_9/iOS) mantenemos la sombra nativa estándar
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
  helpText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 20,
  },
  perfilTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
  detailGrid: { gap: 12 },
  detailRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
    marginTop: 2,
  },
  logoutButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  logoutButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
