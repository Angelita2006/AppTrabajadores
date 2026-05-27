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

export default function VerPerfil() {
  const [pantalla, setPantalla] = useState<
    "registro" | "inicio" | "perfil" | "editar"
  >("inicio");
  const { setTrabajadorActual } = useTrabajador();
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Estados del formulario
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

  const handleSignOut = () => {
    setIsSignedIn(false);
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
    Alert.alert("Sesión cerrada", "Has cerrado sesión correctamente");
  };

  const handleRegister = () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor, ingresa tu email y contraseña");
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
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: "rgb(21, 23, 24)", // Mismo fondo oscuro
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
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Apellidos</ThemedText>
                <TextInput
                  value={apellidos}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
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
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Dirección</ThemedText>
                <TextInput
                  value={direccion}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
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
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Población</ThemedText>
                <TextInput
                  value={poblacion}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
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
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>
                  Cuenta de cotización
                </ThemedText>
                <TextInput
                  value={cuenta_cotizacion}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
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
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <TextInput
                  value={email}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
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
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: "rgb(21, 23, 24)",
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
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Apellidos</ThemedText>
                <TextInput
                  value={apellidos}
                  onChangeText={setApellidos}
                  style={styles.input}
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
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Dirección</ThemedText>
                <TextInput
                  value={direccion}
                  onChangeText={setDireccion}
                  style={styles.input}
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
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Población</ThemedText>
                <TextInput
                  value={poblacion}
                  onChangeText={setPoblacion}
                  style={styles.input}
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
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
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
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: "rgb(21, 23, 24)",
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
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Apellidos</ThemedText>
                <TextInput
                  value={apellidos}
                  onChangeText={setApellidos}
                  style={styles.input}
                  placeholder="Apellidos"
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
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Dirección</ThemedText>
                <TextInput
                  value={direccion}
                  onChangeText={setDireccion}
                  style={styles.input}
                  placeholder="Dirección"
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
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Población</ThemedText>
                <TextInput
                  value={poblacion}
                  onChangeText={setPoblacion}
                  style={styles.input}
                  placeholder="Población"
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
        />

        <ThemedText style={styles.label}>Contraseña</ThemedText>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholder="Tu contraseña"
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
  containerCenter: {
    backgroundColor: "rgb(21, 23, 24)",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  titleContainer: {
    padding: 20,
    alignItems: "center",
  },
  mainTitle: {
    marginBottom: 20,
  },
  formContainer: {
    width: "100%",
    maxWidth: 350,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#38565a",
    padding: 15,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  linkButton: {
    marginTop: 15,
    alignItems: "center",
  },
  linkText: {
    color: "#38565a",
    textDecorationLine: "underline",
  },
  profileContainer: {
    padding: 20,
    backgroundColor: "#e8f5e800",
    borderRadius: 10,
    margin: 10,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  // Estilo para el título de la sección de perfil, que es más grande y en negrita para destacar la información del perfil.
  profileTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  // Estilo para el texto de la información del perfil, que tiene un tamaño de fuente legible y un color oscuro para facilitar la lectura.
  profileText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
  },
  signInButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    margin: 10,
  },
  // Estilo para el botón de cerrar sesión, que tiene un fondo rojo para indicar una acción de cierre de sesión, y
  // un estilo similar al botón de iniciar sesión para mantener la coherencia visual.
  signOutButton: {
    backgroundColor: "#FF3B30",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    margin: 10,
  },
  buttonContainer: {
    backgroundColor: "#f3e5f500",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  row: {
    flexDirection: "row", // Alinea los hijos de forma horizontal
    justifyContent: "space-between", // Distribuye el espacio de manera uniforme
    gap: 12, // Añade separación física entre el input izquierdo y el derecho
    width: "100%",
    backgroundColor: "transparent", // Evita cajas blancas de fondo
  },
  column: {
    flex: 1, // Obliga a ambas columnas a medir exactamente lo mismo (50% cada una)
    backgroundColor: "transparent",
  },
});
