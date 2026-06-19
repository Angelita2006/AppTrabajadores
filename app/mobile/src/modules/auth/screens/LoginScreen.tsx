import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Dimensions,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import {
    getTrabajadorByEmailYPassword,
    obtenerEmpresasTrabajador,
} from "../../../modules/trabajadores/api/services";
import { useTrabajador } from "../../../modules/trabajadores/store/TrabajadorContext";
import { ThemedText } from "../../../shared/components/themed-text";
import { IconSymbol } from "../../../shared/ui/icon-symbol";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const {
    setTrabajadorActual,
    setEmpresas,
    setEmpresaSeleccionada,
    trabajadorActual,
  } = useTrabajador();

  const [email, setEmail] = useState("angelita@example.com");
  const [password, setPassword] = useState("password123");
  const [isObscured, setIsObscured] = useState(true);

  // Valores compartidos para las animaciones dinámicas de fondo y tarjeta
  const granAnimacionFondo = useSharedValue(0);
  const opacidadTarjeta = useSharedValue(0);

  useEffect(() => {
    // Si el usuario ya tiene una sesión iniciada, salta directo al Home
    if (trabajadorActual) {
      router.replace("/(protected)/home");
    }

    // Animación infinita para el movimiento del fondo dinámico
    granAnimacionFondo.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 10000 }),
        withTiming(0, { duration: 10000 }),
      ),
      -1,
      true,
    );

    // Animación de entrada suave para la tarjeta del formulario
    opacidadTarjeta.value = withTiming(1, { duration: 800 });
  }, [granAnimacionFondo, opacidadTarjeta, router, trabajadorActual]);

  const iniciarSesion = async () => {
    try {
      const trabajador = await getTrabajadorByEmailYPassword(email, password);
      const empresas = await obtenerEmpresasTrabajador(trabajador.id);

      setTrabajadorActual(trabajador);
      setEmpresas(empresas);
      setEmpresaSeleccionada(empresas[0] ?? null);

      // Redirige al Home protegido de las pestañas
      router.replace("/(protected)/home");
    } catch {
      Alert.alert(
        "Error de acceso",
        "El correo electrónico o la contraseña introducidos son incorrectos.",
      );
    }
  };

  // Estilos animados con Reanimated
  const estiloFondoAnimado = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: granAnimacionFondo.value * 20 - 10 },
        { translateY: granAnimacionFondo.value * 20 - 10 },
      ],
    };
  });

  const estiloTarjetaAnimada = useAnimatedStyle(() => {
    return {
      opacity: opacidadTarjeta.value,
      transform: [
        {
          translateY: withTiming(
            opacidadTarjeta.value * 0 + (1 - opacidadTarjeta.value) * 30,
          ),
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      {/* CAPA: Fondo de color dinámico */}
      <Animated.View style={[styles.backgroundGradiente, estiloFondoAnimado]} />

      {/* CAPA: Tarjeta de Login centralizada */}
      <Animated.View style={[styles.loginCard, estiloTarjetaAnimada]}>
        <View style={styles.headerContenedor}>
          <ThemedText style={styles.mainTitle}>FICHAPP</ThemedText>
          <ThemedText style={styles.subtitle}>
            Gestión de Control Horario
          </ThemedText>
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>Correo Electrónico</ThemedText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            placeholder="ejemplo@correo.com"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>Contraseña</ThemedText>
          <View style={styles.inputWrapper}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={isObscured}
              style={styles.inputContainer}
              placeholder="Introduce tu contraseña"
              placeholderTextColor="#94a3b8"
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

        <Pressable style={styles.primaryButton} onPress={iniciarSesion}>
          <ThemedText style={styles.buttonText}>Iniciar Sesión</ThemedText>
        </Pressable>

        <ThemedText style={styles.helpText}>
          Usa tus credenciales válidas dadas de alta en el servidor.
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundGradiente: {
    position: "absolute",
    width: width * 1.2,
    height: height * 1.2,
    backgroundColor: "#1E3A8A",
    opacity: 0.6,
    borderRadius: width,
  },
  loginCard: {
    width: width * 0.88,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  headerContenedor: {
    alignItems: "center",
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1E40AF",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  field: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 16,
    color: "#0F172A",
    fontSize: 15,
    backgroundColor: "#F8FAFC",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },
  inputContainer: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    color: "#0F172A",
    fontSize: 15,
  },
  eyeButton: {
    padding: 12,
  },
  primaryButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  helpText: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 16,
  },
});
