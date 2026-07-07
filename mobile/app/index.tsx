import { CentroTrabajo } from "@/src/modules/centros-trabajo/types/centro-trabajo";
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
import { obtenerEmpresa } from "../src/modules/empresas/api/services";
import {
  getUsuarioByEmailYPassword,
  obtenerCentrosPorEmpresa,
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
    empresas,
    setEmpresas,
    empresaSeleccionada,
    setEmpresaSeleccionada,
    contratoActual,
    centroTrabajoActual,
    setCentroTrabajoActual,
  } = useSesion();

  const esTrabajador = usuarioActual?.tipo_usuario === "trabajador";
  const esAdminGestoria = usuarioActual?.tipo_usuario === "admin_gestoria";
  const esAdminEmpresa = usuarioActual?.tipo_usuario === "admin_empresa";
  const esAdmin = esAdminGestoria || esAdminEmpresa;

  const [email, setEmail] = useState("angelitagarciavalera@gmail.com");
  const [password, setPassword] = useState("password123");
  const passwordInputRef = useRef<TextInput | null>(null);
  const [isObscured, setIsObscured] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [cargandoCentros, setCargandoCentros] = useState(false);

  const [errorEmail, setErrorEmail] = useState(false);
  const [errorPassword, setErrorPassword] = useState(false);

  const [centrosDisponibles, setCentrosDisponibles] = useState<CentroTrabajo[]>(
    [],
  );

  const opacidadTarjeta = useSharedValue(0);

  useEffect(() => {
    if (usuarioActual?.id === "1") {
      setUsuarioActual(null);
    }
    opacidadTarjeta.value = 0;
    opacidadTarjeta.value = withTiming(1, { duration: 500 });
  }, [opacidadTarjeta, setUsuarioActual, usuarioActual]);

  // CARGA REACTIVA DE CENTROS AL CAMBIAR DE EMPRESA EN EL PERFIL
  useEffect(() => {
    const cargarCentrosDeLaEmpresa = async () => {
      if (!empresaSeleccionada?.id) return;

      try {
        setCargandoCentros(true);
        const centros = await obtenerCentrosPorEmpresa(empresaSeleccionada.id);
        setCentrosDisponibles(centros);

        if (centros.length > 0) {
          if (
            !centroTrabajoActual ||
            centroTrabajoActual.empresa_id !== empresaSeleccionada.id
          ) {
            setCentroTrabajoActual(centros[0]);
          }
        } else {
          setCentroTrabajoActual(null);
        }
      } catch (err) {
        console.error("Error al cargar centros de trabajo:", err);
      } finally {
        setCargandoCentros(false);
      }
    };

    cargarCentrosDeLaEmpresa();
  }, [empresaSeleccionada?.id]);

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
      setUsuarioActual(usuarioSesion);

      if (
        usuarioSesion.tipo_usuario === "admin_empresa" &&
        usuarioSesion.empresa_id
      ) {
        const empresa = await obtenerEmpresa(usuarioSesion.empresa_id);
        setEmpresas([empresa]);
        setEmpresaSeleccionada(empresa);
      } else if (usuarioSesion.trabajador_id) {
        try {
          const empresasTrabajador = await obtenerEmpresasTrabajador(
            usuarioSesion.trabajador_id,
          );
          setEmpresas(empresasTrabajador);
          if (empresasTrabajador.length > 0) {
            setEmpresaSeleccionada(empresasTrabajador[0]);
          }
        } catch (errorEmpresa) {
          console.log("Error al cargar empresas del trabajador:", errorEmpresa);
        }
      }
    } catch (error: any) {
      const mensajeErrorApi =
        error.response?.data?.detail ||
        "No se pudo conectar con el servidor. Revisa tu conexión.";

      if (Platform.OS === "web") {
        alert(`Fallo de Autenticación: ${mensajeErrorApi}`);
      } else {
        Alert.alert("Fallo de Autenticación", mensajeErrorApi);
      }
    } finally {
      setCargando(false);
    }
  };

  const handleLogout = () => {
    setUsuarioActual(null);
    setEmpresas([]);
    setEmpresaSeleccionada(null);
    setCentroTrabajoActual(null);
    setCentrosDisponibles([]);
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

  const puedeCambiarEmpresa =
    esAdminGestoria && empresas.length > 1 && !!empresaSeleccionada;

  const renderEmpresaSelection = (usuario: typeof usuarioActual) => {
    const esAdminEmpresaLocal = usuario?.tipo_usuario === "admin_empresa";

    return (
      <View style={styles.selectorContainer}>
        <ThemedText style={styles.detailLabel}>
          {puedeCambiarEmpresa ? "Cambiar de Empresa" : "Empresa vinculada"}
        </ThemedText>
        <View style={styles.pickerWrapper}>
          {puedeCambiarEmpresa ? (
            empresas.map((emp) => {
              const estaSeleccionada = empresaSeleccionada?.id === emp.id;
              return (
                <Pressable
                  key={emp.id}
                  style={[
                    styles.selectorItem,
                    estaSeleccionada && styles.selectorItemActivo,
                  ]}
                  onPress={() => {
                    if (empresaSeleccionada?.id !== emp.id) {
                      setEmpresaSeleccionada(emp);
                    }
                  }}
                >
                  <ThemedText
                    style={[
                      styles.selectorItemText,
                      estaSeleccionada && styles.selectorItemTextActivo,
                    ]}
                  >
                    {emp.nombre_comercial}
                  </ThemedText>
                </Pressable>
              );
            })
          ) : (
            <ThemedText style={styles.selectorSingleText}>
              {empresaSeleccionada?.nombre_comercial ??
                "No hay empresa vinculada"}
            </ThemedText>
          )}
        </View>
      </View>
    );
  };

  const renderAdminProfile = () => {
    const usuario = usuarioActual;
    if (!usuario) return null;

    return (
      <AppScreen title="Panel de Gestión">
        <Row>
          <StatCard
            label="Rol de Sistema"
            value={usuario.tipo_usuario
              .toString()
              .replace("_", " ")
              .toUpperCase()}
          />
          <StatCard
            label="Empresas visibles"
            value={empresas.length.toString()}
          />
        </Row>

        <Animated.View
          style={[estiloTarjetaAnimada, { gap: 16, paddingBottom: 30 }]}
        >
          <Card>
            <View style={styles.seccionPerfilHeader}>
              <IconSymbol name="business" size={20} color="#EA580C" />
              <ThemedText style={[styles.perfilTitle, { color: "#EA580C" }]}>
                Mi Empresa Activa
              </ThemedText>
            </View>
            <View style={styles.separadorPerfil} />
            <View style={styles.detailGrid}>
              {renderEmpresaSelection(usuario)}
              <Detail
                label="CIF / NIF"
                value={empresaSeleccionada?.cif ?? "No disponible"}
              />
              <Detail
                label="Zona Horaria"
                value={empresaSeleccionada?.zona_horaria ?? "Europe/Madrid"}
              />
            </View>
          </Card>

          <Card>
            <View style={styles.seccionPerfilHeader}>
              <IconSymbol name="manage-accounts" size={20} color="#475569" />
              <ThemedText style={[styles.perfilTitle, { color: "#475569" }]}>
                Seguridad y Cuenta
              </ThemedText>
            </View>
            <View style={styles.separadorPerfil} />
            <View style={styles.detailGrid}>
              <Detail label="Correo Electrónico" value={usuario.email} />
              <Detail
                label="Último Acceso"
                value={
                  usuario.ultimo_acceso
                    ? usuario.ultimo_acceso
                        .replace("T", " a las ")
                        .substring(0, 32)
                        .concat(" hs")
                    : "Sesión Actual"
                }
              />
            </View>
          </Card>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <IconSymbol name="logout" size={18} color="#FFFFFF" />
            <ThemedText style={styles.logoutButtonText}>
              Cerrar Sesión
            </ThemedText>
          </Pressable>
        </Animated.View>
      </AppScreen>
    );
  };

  if (usuarioActual && esAdmin) {
    return renderAdminProfile();
  }

  if (usuarioActual && trabajadorActual) {
    return (
      <AppScreen title="Mi Perfil">
        <Row>
          <StatCard
            label="Estado Alta"
            value={usuarioActual?.activo ? "Activo" : "Inactivo"}
            tone={usuarioActual?.activo ? "success" : "danger"}
          />
          <StatCard
            label="Empresa Activa"
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
                value={`${trabajadorActual?.nombre} ${trabajadorActual.apellidos}`}
              />
              <Detail
                label="Documento (NIF/NIE)"
                value={trabajadorActual?.nif_nie}
              />
              <Detail
                label="Número Seguridad Social"
                value={
                  trabajadorActual?.numero_seguridad_social ??
                  "No cumplimentado"
                }
              />
              <Detail
                label="Teléfono Móvil"
                value={trabajadorActual?.telefono ?? "No registrado"}
              />
            </View>
          </Card>

          {/* BLOCK 2: DETALLES DE CONTRATACIÓN */}
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
                label="Jornada Semanal"
                value={
                  contratoActual?.horas_semana
                    ? `${contratoActual.horas_semana} hs/semana`
                    : "Según Convenio Colectivo"
                }
              />
            </View>
          </Card>

          {/* BLOCK 3: ADSCRIPCIÓN CORPORATIVA E INTERCAMBIO DE ENTIDADES */}
          <Card>
            <View style={styles.seccionPerfilHeader}>
              <IconSymbol name="business" size={20} color="#EA580C" />
              <ThemedText style={[styles.perfilTitle, { color: "#EA580C" }]}>
                Organización y Centro de Fichaje
              </ThemedText>
            </View>
            <View style={styles.separadorPerfil} />

            <View style={styles.detailGrid}>
              {/* SELECTOR DE EMPRESAS DISPONIBLES */}
              <View style={styles.selectorContainer}>
                <ThemedText style={styles.detailLabel}>
                  {empresas.length > 1
                    ? "Cambiar de Empresa"
                    : "Empresa vinculada"}
                </ThemedText>
                {empresas.length > 1 ? (
                  <View style={styles.pickerWrapper}>
                    {empresas.map((emp) => (
                      <Pressable
                        key={emp.id}
                        style={[
                          styles.selectorItem,
                          empresaSeleccionada?.id === emp.id &&
                            styles.selectorItemActivo,
                        ]}
                        onPress={() => {
                          if (empresaSeleccionada?.id !== emp.id) {
                            setEmpresaSeleccionada(emp);
                          }
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.selectorItemText,
                            empresaSeleccionada?.id === emp.id &&
                              styles.selectorItemTextActivo,
                          ]}
                        >
                          {emp.nombre_comercial}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={styles.pickerWrapper}>
                    <ThemedText style={styles.selectorSingleText}>
                      {empresaSeleccionada?.nombre_comercial ??
                        "No hay empresa vinculada"}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* SELECTOR EN CASCADA DE CENTROS DE TRABAJO */}
              <View style={styles.selectorContainer}>
                <ThemedText style={styles.detailLabel}>
                  Seleccionar Sede / Centro
                </ThemedText>
                {cargandoCentros ? (
                  <ActivityIndicator
                    size="small"
                    color="#EA580C"
                    style={{ marginVertical: 10 }}
                  />
                ) : (
                  <View style={styles.pickerWrapperHorizontal}>
                    {centrosDisponibles.length > 0 ? (
                      centrosDisponibles.map((centro) => (
                        <Pressable
                          key={centro.id}
                          style={[
                            styles.chipCentro,
                            centroTrabajoActual?.id === centro.id &&
                              styles.chipCentroActivo,
                          ]}
                          onPress={() => {
                            if (centroTrabajoActual?.id !== centro.id) {
                              setCentroTrabajoActual(centro);
                            }
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.chipCentroText,
                              centroTrabajoActual?.id === centro.id &&
                                styles.chipCentroTextActivo,
                            ]}
                          >
                            {centro.nombre}
                          </ThemedText>
                        </Pressable>
                      ))
                    ) : (
                      <ThemedText style={styles.detailValue}>
                        No hay centros configurados para esta empresa
                      </ThemedText>
                    )}
                  </View>
                )}
              </View>

              {/* CONTENEDOR DE LA ZONA HORARIA DINÁMICA */}
              <View style={styles.zonaHorariaCard}>
                <IconSymbol name="schedule" size={16} color="#475569" />
                <ThemedText style={styles.zonaHorariaTexto}>
                  Zona Horaria de Registro:{" "}
                  <ThemedText style={{ fontWeight: "700", color: "#0F172A" }}>
                    {centroTrabajoActual?.zona_horaria ?? "Europe/Madrid"}
                  </ThemedText>
                </ThemedText>
              </View>

              <Detail
                label="Dirección de la Sede"
                value={centroTrabajoActual?.direccion ?? "No registrada"}
              />
              <Detail
                label="CIF / NIF Empresa"
                value={empresaSeleccionada?.cif ?? "No disponible"}
              />
            </View>
          </Card>

          {/* BLOCK 4: SEGURIDAD Y CUENTA */}
          <Card>
            <View style={styles.seccionPerfilHeader}>
              <IconSymbol name="manage-accounts" size={20} color="#475569" />
              <ThemedText style={[styles.perfilTitle, { color: "#475569" }]}>
                Seguridad y Cuenta
              </ThemedText>
            </View>
            <View style={styles.separadorPerfil} />
            <View style={styles.detailGrid}>
              <Detail label="Correo Electrónico" value={usuarioActual.email} />
              <Detail
                label="Rol Autorizado Sistema"
                value={usuarioActual.tipo_usuario.toString().toUpperCase()}
              />
              <Detail
                label="Último Acceso Registrado"
                value={
                  usuarioActual.ultimo_acceso
                    ? usuarioActual.ultimo_acceso
                        .replace("T", " a las ")
                        .substring(0, 32)
                        .concat(" hs")
                    : "Sesión Actual"
                }
              />
            </View>
          </Card>

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
          {/* CAMPO CORREO ELECTRÓNICO */}
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
          {/* CAMPO CONTRASEÑA */}
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
            <Pressable
              onPress={() =>
                router.replace("/(authentication)/recuperar-password")
              }
              style={{ alignSelf: "center", marginVertical: 16 }}
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
            style={{ alignSelf: "center", marginVertical: 16 }}
          >
            <ThemedText
              style={{ fontSize: 13, color: "#2563EB", fontWeight: "700" }}
            >
              ¿No tienes una cuenta? Regístrate
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() =>
              router.replace("/(authentication)/registro-organizacion")
            }
            style={styles.organizationRegisterButton}
          >
            <IconSymbol
              name="business"
              size={16}
              color="#1E293B"
              style={{ marginRight: 6 }}
            />

            <ThemedText style={styles.organizationRegisterText}>
              Quiero registrar mi organización / empresa
            </ThemedText>
          </Pressable>{" "}
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
    width: "90%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    ...Platform.select({
      web: { boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.1)" },
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
  perfilTitle: { color: "#2563EB", fontSize: 18, fontWeight: "800" },
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
  separadorPerfil: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 6 },
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
  selectorContainer: { marginVertical: 4 },
  pickerWrapper: { flexDirection: "column", gap: 6, marginTop: 6 },
  selectorSingleText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
  },
  selectorNote: {
    color: "#475569",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 20,
  },
  pickerWrapperHorizontal: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  selectorItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  selectorItemActivo: { borderColor: "#EA580C", backgroundColor: "#FFF7ED" },
  selectorItemText: { fontSize: 14, color: "#475569", fontWeight: "500" },
  selectorItemTextActivo: { color: "#EA580C", fontWeight: "700" },
  chipCentro: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  chipCentroActivo: { borderColor: "#EA580C", backgroundColor: "#EA580C" },
  chipCentroText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  chipCentroTextActivo: { color: "#FFFFFF", fontWeight: "700" },
  zonaHorariaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  zonaHorariaTexto: { fontSize: 13, color: "#64748B" },
  organizationRegisterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 48,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    marginTop: 8,
    marginBottom: 12,
  },
  organizationRegisterText: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "700",
  },
});
