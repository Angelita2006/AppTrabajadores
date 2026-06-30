import { CentroTrabajo } from "@/src/modules/centros-trabajo/types/centro-trabajo";
import { router } from "expo-router";
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
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  getUsuarioByEmailYPassword,
  obtenerCentroTrabajo,
  obtenerEmpresasTrabajador,
} from "../src/modules/trabajadores/api/services";
import { useSesion } from "../src/modules/trabajadores/store/SesionContext";
import { ThemedText } from "../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../src/shared/ui/AppSurface";
import VideoBackground from "../src/shared/ui/VideoBackground";
import { IconSymbol } from "../src/shared/ui/icon-symbol";

export default function RootIndexScreen() {
  const {
    usuarioActual,
    setUsuarioActual,
    trabajadorActual,
    setEmpresas,
    setEmpresaSeleccionada,
    empresaSeleccionada,
    contratoActual,
    centroTrabajoId,
  } = useSesion();
  const [centroAsignado, setCentroAsignado] = useState<CentroTrabajo | null>(
    null,
  );

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
    // Si el formulario no es válido, detenemos la ejecución inmediatamente
    if (!validarFormulario()) {
      console.log("Formulario no válido.");
      return;
    }

    try {
      console.log("Cargando...");
      setCargando(true);

      // Intentamos el login en el backend
      const usuarioSesion = await getUsuarioByEmailYPassword(email, password);
      setUsuarioActual(usuarioSesion);
      console.log("Usuario actual: " + usuarioSesion?.nombre.toString());

      // Si el login fue exitoso y tiene un trabajador asociado, cargamos sus empresas
      if (usuarioSesion.trabajador_id !== null) {
        try {
          const empresas = await obtenerEmpresasTrabajador(
            usuarioSesion.trabajador_id,
          );
          setEmpresas(empresas);
          if (empresas.length > 0) {
            setEmpresaSeleccionada(empresas[0]);
            console.log(
              "Empresa seleccionada: " + empresas[0].nombre_comercial,
            );
          } else {
            console.log("Este trabajador no tiene empresas asignadas.");
          }
        } catch (errorEmpresa) {
          console.log(
            "Error secundario al cargar empresas o turnos:",
            errorEmpresa,
          );
          // Aquí podrías poner una alerta secundaria si lo deseas,
          // pero el usuario ya habrá iniciado sesión correctamente.
        }
      }
    } catch (error: any) {
      const mensajeErrorApi =
        error.response?.data?.detail ||
        "No se pudo conectar con el servidor. Revisa tu conexión.";

      Alert.alert("Fallo de Autenticación", mensajeErrorApi);
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

  useEffect(() => {
    const cargarInformacionExpediente = async () => {
      if (!usuarioActual?.trabajador_id) return;

      try {
        if (contratoActual?.centro_trabajo_id) {
          try {
            const centroObj = await obtenerCentroTrabajo(
              contratoActual.centro_trabajo_id,
            );
            setCentroAsignado(centroObj);
          } catch (errCentro) {
            console.log(
              "No se pudo resolver el nombre del centro de trabajo:",
              errCentro,
            );
          }
        }
      } catch (error) {
        console.error("Error al cargar expediente:", error);
      }
    };

    cargarInformacionExpediente();
  }, [usuarioActual, contratoActual?.centro_trabajo_id]); // Vigila el ID del contrato

  // ====================================================================
  // VISTA DE PERFIL (USUARIO LOGUEADO)
  // ====================================================================
  if (usuarioActual && trabajadorActual) {
    return (
      <AppScreen title="Mi Perfil">
        {/* FILA DE HITOS RÁPIDOS SUPERIORES */}
        <Row>
          <StatCard
            label="Estado Alta"
            value={usuarioActual.activo ? "Activo" : "Inactivo"}
            tone={usuarioActual.activo ? "success" : "danger"}
          />
          <StatCard
            label="Empresa Principal"
            value={empresaSeleccionada?.nombre_comercial ?? "Sin Asignar"}
          />
        </Row>

        <Animated.View
          style={[estiloTarjetaAnimada, { gap: 16, paddingBottom: 30 }]}
        >
          {/* BLOCK 1: IDENTIDAD DEL TRABAJADOR */}
          <Card>
            <View style={styles.seccionPerfilHeader}>
              <IconSymbol name="person" size={20} color="#2563EB" />
              <ThemedText style={styles.perfilTitle}>
                Información Personal
              </ThemedText>
            </View>
            <View style={styles.separadorPerfil} />
            <View style={styles.detailGrid}>
              <Detail
                label="Nombre Completo"
                value={`${trabajadorActual.nombre} ${trabajadorActual.apellidos}`}
              />
              <Detail
                label="Documento (NIF/NIE)"
                value={trabajadorActual.nif_nie}
              />
              <Detail
                label="Número Seguridad Social"
                value={
                  trabajadorActual.numero_seguridad_social ?? "No cumplimentado"
                }
              />
              <Detail
                label="Teléfono Móvil"
                value={trabajadorActual.telefono ?? "No registrado"}
              />
            </View>
          </Card>

          {/* BLOCK 2: DETALLES DE CONTRATACIÓN Y CONDICIONES (CONTRATOACTUAL) */}
          <Card>
            <View style={styles.seccionPerfilHeader}>
              <IconSymbol name="description" size={20} color="#16A34A" />
              <ThemedText style={[styles.perfilTitle, { color: "#16A34A" }]}>
                Condiciones Contractuales
              </ThemedText>
            </View>
            <View style={styles.separadorPerfil} />
            <View style={styles.detailGrid}>
              <Detail
                label="Puesto de Trabajo"
                value={
                  contratoActual?.puesto_trabajo ?? "Operario / No Definido"
                }
              />
              <Detail
                label="Tipo de Contrato"
                value={contratoActual?.tipo_contrato ?? "Régimen General"}
              />
              <Detail
                label="Fecha Alta Contrato"
                value={
                  contratoActual?.fecha_inicio ??
                  trabajadorActual.fecha_alta_empresa ??
                  "No consta"
                }
              />
              <Detail
                label="Vencimiento / Fin"
                value={contratoActual?.fecha_fin ?? "Indefinido / Continuo"}
              />
              <Detail
                label="Jornada Semanal Anual"
                value={
                  contratoActual?.horas_semana
                    ? `${contratoActual.horas_semana} hs/semana`
                    : "Según Convenio Colectivo"
                }
              />
            </View>
          </Card>

          {/* BLOCK 3: ADSCRIPCIÓN CORPORATIVA Y ORGANIZACIÓN */}
          <Card>
            <View style={styles.seccionPerfilHeader}>
              <IconSymbol name="business" size={20} color="#EA580C" />
              <ThemedText style={[styles.perfilTitle, { color: "#EA580C" }]}>
                Organización y Destino
              </ThemedText>
            </View>
            <View style={styles.separadorPerfil} />
            <View style={styles.detailGrid}>
              <Detail
                label="Nombre Comercial"
                value={empresaSeleccionada?.nombre_comercial ?? "No vinculada"}
              />
              <Detail
                label="CIF / NIF Empresa"
                value={empresaSeleccionada?.cif ?? "No disponible"}
              />
              <Detail
                label="Centro de Trabajo"
                value={centroAsignado?.nombre ?? "Sede Central"}
              />
              <Detail
                label="Dirección"
                value={centroAsignado?.direccion ?? "No registrada"}
              />
            </View>
          </Card>

          {/* BLOCK 4: CREDENCIALES DE ACCESO AL PORTAL */}
          <Card>
            <View style={styles.seccionPerfilHeader}>
              <IconSymbol name="manage-accounts" size={20} color="#475569" />
              <ThemedText style={[styles.perfilTitle, { color: "#475569" }]}>
                Seguridad y Cuenta
              </ThemedText>
            </View>
            <View style={styles.separadorPerfil} />
            <View style={styles.detailGrid}>
              <Detail
                label="Correo Electrónico (Login)"
                value={usuarioActual.email}
              />
              <Detail
                label="Rol Autorizado Sistema"
                value={usuarioActual.tipo_usuario}
              />
              <Detail
                label="Último Fichaje Registrado"
                value={
                  usuarioActual.ultimo_acceso
                    ? usuarioActual.ultimo_acceso
                        .replace("T", " Realizado a las ")
                        .substring(0, 32)
                        .concat(" horas")
                    : "Sesión Actual"
                }
              />
            </View>
          </Card>

          {/* BOTÓN CENTRALIZADO DE SALIDA SEGURA */}
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <IconSymbol name="logout" size={18} color="#FFFFFF" />
            <ThemedText style={styles.logoutButtonText}>
              Cerrar Sesión
            </ThemedText>
          </Pressable>
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
          <Pressable
            onPress={() => router.replace("/(authentication)/registro")}
            style={{
              alignSelf: "center",
              marginBottom: 16,
              marginTop: 16,
            }}
          >
            <ThemedText
              style={{ fontSize: 13, color: "#2563EB", fontWeight: "700" }}
            >
              ¿No tienes una cuenta? Regístrate
            </ThemedText>
          </Pressable>
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
    color: "#2563EB",
    fontSize: 18,
    fontWeight: "800",
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
  logoutButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  seccionPerfilHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  separadorPerfil: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 6,
  },
  logoutButton: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
});
