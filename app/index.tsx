import { useState } from "react";
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { ThemedText } from "../components/themed-text";
import { ThemedView } from "../components/themed-view";
import { useTrabajador } from "../context/TrabajadorContext";
import { Estado } from "../src/models/trabajadores";
import {
  crearTrabajador,
  editarEstadoTrabajador,
  editarTrabajador,
  getTrabajadorByEmailYContraseña,
} from "../src/services/trabajadoresService";
import { useFichajeStore } from "../store/useFichajeStore";

export default function VerPerfil() {
  // Pantalla actual de la vista: inicio de sesión, registro, perfil o edición.
  const [pantalla, setPantalla] = useState<
    "registro" | "inicio" | "perfil" | "editar"
  >("inicio");

  // Contexto global para actualizar el trabajador actual y la empresa seleccionada.
  const { setTrabajadorActual, setEmpresaSeleccionada, setEmpresas } =
    useTrabajador();
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Campos del formulario y datos del trabajador.
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [direccion, setDireccion] = useState("");
  const [codigo_postal, setCodigoPostal] = useState("");
  const [poblacion, setPoblacion] = useState("");
  const [provincia, setProvincia] = useState("");
  const [cuenta_cotizacion, setCuentaCotizacion] = useState("");
  const [puesto, setPuesto] = useState("");
  const [estado, setEstado] = useState(Estado.Inactivo);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // CORREGIDO: Nuevo estado

  // Maneja el cierre de sesión del usuario, limpiando todos los campos locales.
  const handleSignOut = () => {
    setIsSignedIn(false);
    setTrabajadorActual(null);
    setEmpresaSeleccionada(null);
    setEmpresas([]);
    useFichajeStore.getState().resetStore();
    setNombre("");
    setApellidos("");
    setDni("");
    setDireccion("");
    setCodigoPostal("");
    setPoblacion("");
    setProvincia("");
    setCuentaCotizacion("");
    setPuesto("");
    setEstado(Estado.Inactivo);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    Alert.alert("Sesión cerrada", "Has cerrado sesión correctamente");
  };

  const handleRegister = () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Por favor, completa todos los campos de registro");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }

    const trabajador = crearTrabajador(
      nombre,
      apellidos,
      dni,
      puesto,
      direccion,
      codigo_postal,
      poblacion,
      provincia,
      cuenta_cotizacion,
      email,
      password,
    );
    setTrabajadorActual(trabajador);
    Alert.alert("Éxito", "Registro del trabajador completado correctamente");
    setIsSignedIn(true);
    setPantalla("perfil");
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor, ingresa tu email y contraseña");
      return;
    }

    try {
      const trabajador = await getTrabajadorByEmailYContraseña(email, password);

      if (!trabajador) {
        Alert.alert("Error", "El email o la contraseña son incorrectos");
        return;
      }

      await editarEstadoTrabajador(trabajador.dni, Estado.Activo);

      setNombre(trabajador.nombre);
      setApellidos(trabajador.apellidos);
      setDni(trabajador.dni);
      setDireccion(trabajador.direccion);
      setCodigoPostal(trabajador.codigo_postal);
      setPoblacion(trabajador.poblacion);
      setProvincia(trabajador.provincia);
      setCuentaCotizacion(trabajador.cuenta_cotizacion);
      setPuesto(trabajador.puesto);
      setEstado(Estado.Activo);
      setTrabajadorActual(trabajador);

      Alert.alert("Éxito", "Sesión del trabajador iniciada correctamente");
      setIsSignedIn(true);
      setPantalla("perfil"); // Cambiamos a la vista de perfil tras un login exitoso
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Hubo un problema en el servidor");
    }
  };

  const handleSubmit = async () => {
    const trabajador = editarTrabajador(
      dni,
      nombre,
      apellidos,
      direccion,
      codigo_postal,
      poblacion,
      provincia,
      cuenta_cotizacion,
      puesto,
      estado,
      email,
      password,
    );

    setTrabajadorActual(await trabajador);

    Alert.alert("Éxito", "Información del perfil guardada correctamente");
    setIsSignedIn(true);
  };

  // VISTA 1: Perfil del usuario (Cuando ya ha iniciado sesión)
  if (pantalla === "perfil" && isSignedIn) {
    return (
      <Animated.ScrollView
        style={styles.page}
        contentContainerStyle={[
          styles.scrollContent,
          {
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ThemedView style={styles.containerCenter}>
          <ThemedText type="title" style={styles.mainTitle}>
            Perfil de {nombre}
          </ThemedText>

          <ThemedView style={[styles.formContainer, { maxWidth: 500 }]}>
            {/* FILA 1: Nombre y Apellidos */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Nombre</ThemedText>
                <TextInput
                  value={nombre}
                  editable={false} // Bloqueado, solo visualización
                  style={[styles.input, { opacity: 0.8, color: "#94a3b8" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Apellidos</ThemedText>
                <TextInput
                  value={apellidos}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#94a3b8" }]}
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 2: DNI y Dirección */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>DNI</ThemedText>
                <TextInput
                  value={dni}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#94a3b8" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Dirección</ThemedText>
                <TextInput
                  value={direccion}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#94a3b8" }]}
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 3: Código Postal y Población */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Código Postal</ThemedText>
                <TextInput
                  value={codigo_postal}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#94a3b8" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Población</ThemedText>
                <TextInput
                  value={poblacion}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#94a3b8" }]}
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 4: Provincia y Cuenta de cotización */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Provincia</ThemedText>
                <TextInput
                  value={provincia}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#94a3b8" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>
                  Cuenta de cotización
                </ThemedText>
                <TextInput
                  value={cuenta_cotizacion}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#94a3b8" }]}
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 5: Puesto y Email */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Puesto</ThemedText>
                <TextInput
                  value={puesto}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#94a3b8" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <TextInput
                  value={email}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#94a3b8" }]}
                />
              </ThemedView>
            </ThemedView>

            <ThemedView style={[styles.row, { marginTop: 15 }]}>
              <TouchableOpacity
                style={[styles.button, { flex: 1, marginTop: 0 }]}
                onPress={() => setPantalla("editar")}
              >
                <Text style={styles.buttonText}>Editar perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  { flex: 1, marginTop: 0, backgroundColor: "#b93a3a" },
                ]}
                onPress={() => {
                  handleSignOut();
                  setPantalla("inicio");
                }}
              >
                <Text style={styles.buttonText}>Cerrar sesión</Text>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Animated.ScrollView>
    );
  }

  if (pantalla === "editar" && isSignedIn) {
    return (
      <Animated.ScrollView
        style={styles.page}
        contentContainerStyle={[
          styles.scrollContent,
          {
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ThemedView style={styles.containerCenter}>
          <ThemedText type="title" style={styles.mainTitle}>
            Editar perfil de {nombre}
          </ThemedText>

          <ThemedView style={[styles.formContainer, { maxWidth: 500 }]}>
            {/* FILA 1: Nombre y Apellidos */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Nombre</ThemedText>
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Apellidos</ThemedText>
                <TextInput
                  value={apellidos}
                  onChangeText={setApellidos}
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 2: DNI y Dirección */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>DNI</ThemedText>
                <TextInput
                  value={dni}
                  onChangeText={setDni}
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Dirección</ThemedText>
                <TextInput
                  value={direccion}
                  onChangeText={setDireccion}
                  style={styles.input}
                  placeholder="Dirección"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 3: Código Postal y Población */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Código postal</ThemedText>
                <TextInput
                  value={codigo_postal}
                  onChangeText={setCodigoPostal}
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Población</ThemedText>
                <TextInput
                  value={poblacion}
                  onChangeText={setPoblacion}
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 4: Provincia y Cuenta de cotización */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Provincia</ThemedText>
                <TextInput
                  value={provincia}
                  onChangeText={setProvincia}
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>
                  Cuenta de cotización
                </ThemedText>
                <TextInput
                  value={cuenta_cotizacion}
                  onChangeText={setCuentaCotizacion}
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 5: Puesto y Email */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Puesto</ThemedText>
                <TextInput
                  value={puesto}
                  onChangeText={setPuesto}
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
            </ThemedView>

            <ThemedView style={[styles.row, { marginTop: 15 }]}>
              <TouchableOpacity
                style={[styles.button, { flex: 1, marginTop: 0 }]}
                onPress={() => {
                  handleSubmit();
                  setPantalla("perfil");
                }}
              >
                <Text style={styles.buttonText}>Guardar cambios</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  { flex: 1, marginTop: 0, backgroundColor: "#6c757d" },
                ]}
                onPress={() => setPantalla("perfil")}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Animated.ScrollView>
    );
  }

  // VISTA 2: Formulario de Registro
  if (pantalla === "registro") {
    return (
      <Animated.ScrollView
        style={styles.page}
        contentContainerStyle={[
          styles.scrollContent,
          {
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ThemedView style={styles.containerCenter}>
          <ThemedText type="title" style={styles.mainTitle}>
            Registro
          </ThemedText>

          <ThemedView style={[styles.formContainer, { maxWidth: 500 }]}>
            {/* FILA 1: Nombre y Apellidos */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Nombre</ThemedText>
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  style={styles.input}
                  placeholder="Nombre"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Apellidos</ThemedText>
                <TextInput
                  value={apellidos}
                  onChangeText={setApellidos}
                  style={styles.input}
                  placeholder="Apellidos"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 2: DNI y Dirección */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>DNI</ThemedText>
                <TextInput
                  value={dni}
                  onChangeText={setDni}
                  style={styles.input}
                  placeholder="DNI"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Dirección</ThemedText>
                <TextInput
                  value={direccion}
                  onChangeText={setDireccion}
                  style={styles.input}
                  placeholder="Dirección"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 3: Código Postal y Población */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Código Postal</ThemedText>
                <TextInput
                  value={codigo_postal}
                  onChangeText={setCodigoPostal}
                  style={styles.input}
                  placeholder="C.P."
                  keyboardType="number-pad"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Población</ThemedText>
                <TextInput
                  value={poblacion}
                  onChangeText={setPoblacion}
                  style={styles.input}
                  placeholder="Población"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 4: Provincia y Cuenta de cotización */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Provincia</ThemedText>
                <TextInput
                  value={provincia}
                  onChangeText={setProvincia}
                  style={styles.input}
                  placeholder="Provincia"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>
                  Cuenta de cotización
                </ThemedText>
                <TextInput
                  value={cuenta_cotizacion}
                  onChangeText={setCuentaCotizacion}
                  style={styles.input}
                  placeholder="Nº Cotización"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 5: Puesto y Email */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Puesto</ThemedText>
                <TextInput
                  value={puesto}
                  onChangeText={setPuesto}
                  style={styles.input}
                  placeholder="Puesto"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  style={styles.input}
                  placeholder="ejemplo@correo.com"
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 6: Contraseña y Confirmar Contraseña */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Contraseña</ThemedText>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>
                  Confirmar contraseña
                </ThemedText>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  style={styles.input}
                  placeholder="Confirma"
                  placeholderTextColor="#94a3b8"
                />
              </ThemedView>
            </ThemedView>

            <TouchableOpacity style={styles.button} onPress={handleRegister}>
              <Text style={styles.buttonText}>Registrarse</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setPantalla("inicio")}
            >
              <Text style={styles.linkText}>
                ¿Ya tienes cuenta? Inicia sesión aquí
              </Text>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </Animated.ScrollView>
    );
  }

  // VISTA 3: Formulario de Inicio de Sesión
  return (
    <ThemedView style={styles.containerCenter}>
      <ThemedText type="title" style={styles.mainTitle}>
        Iniciar Sesión
      </ThemedText>

      <ThemedView style={styles.formContainer}>
        <ThemedText style={styles.label}>Email</ThemedText>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={styles.input}
          placeholder="ejemplo@correo.com"
          autoCapitalize="none"
          placeholderTextColor="#94a3b8"
        />

        <ThemedText style={styles.label}>Contraseña</ThemedText>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholder="Tu contraseña"
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity style={styles.button} onPress={handleSignIn}>
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setPantalla("registro")}
        >
          <Text style={styles.linkText}>
            ¿No tienes cuenta? Regístrate aquí
          </Text>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#071826",
    padding: 20,
  },
  containerCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#071826",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#14436d",
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  mainTitle: {
    marginBottom: 24,
    color: "#e2f6ff",
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#0f2a45",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#14436d",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "600",
    color: "#cde9ff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#14436d",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#0a304f",
    color: "#f8fafc",
  },
  button: {
    backgroundColor: "#16c2d9",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
  linkButton: {
    marginTop: 18,
    alignItems: "center",
  },
  linkText: {
    color: "#7dd3fc",
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  profileTitle: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 20,
    color: "#e2f6ff",
  },
  profileText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#cde9ff",
  },
  signOutButton: {
    backgroundColor: "#ef5b5b",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    margin: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
    backgroundColor: "transparent",
  },
  column: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
