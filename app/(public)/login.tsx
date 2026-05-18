import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ParallaxScrollView from "../../components/parallax-scroll-view";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { useTrabajador } from "../../context/TrabajadorContext";
import {
  crearTrabajador,
  editarTrabajador,
  getTrabajadorByEmailYPassword,
} from "../../services/trabajadoresService";

export default function LoginScreen() {
  const [pantalla, setPantalla] = useState<
    "registro" | "inicio" | "perfil" | "editar"
  >("inicio");

  const { setTrabajadorActual } = useTrabajador();
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [direccion, setDireccion] = useState("");
  const [codigo_postal, setCodigoPostal] = useState("");
  const [poblacion, setPoblacion] = useState("");
  const [provincia, setProvincia] = useState("");
  const [cuenta_cotizacion, setCuentaCotizacion] = useState("");
  const [puesto, setPuesto] = useState("");
  const [email, setEmail] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [confirmarContraseña, setConfirmarContraseña] = useState("");

  const handleSignOut = () => {
    setIsSignedIn(false);
    setTrabajadorActual(null);
    setNombre("");
    setApellidos("");
    setDni("");
    setDireccion("");
    setCodigoPostal("");
    setPoblacion("");
    setProvincia("");
    setCuentaCotizacion("");
    setPuesto("");
    setEmail("");
    setContraseña("");
    Alert.alert("Sesión cerrada", "Has cerrado sesión correctamente");
  };

  const handleRegister = async () => {
    if (contraseña !== confirmarContraseña) {
      Alert.alert("Error", "Las contraseñas no coinciden.");
      return;
    }
    try {
      const trabajador = await crearTrabajador(
        dni,
        nombre,
        apellidos,
        codigo_postal,
        direccion,
        poblacion,
        provincia,
        cuenta_cotizacion,
        puesto,
        email,
        contraseña,
      );
      setTrabajadorActual(trabajador);
      setIsSignedIn(true);
      setPantalla("perfil");
      Alert.alert("Éxito", "Registro del trabajador completado correctamente");
    } catch (error) {
      Alert.alert("Error", "No se pudo registrar el trabajador.");
      console.error(error);
    }
  };

  const handleSignIn = async () => {
    try {
      const trabajador = await getTrabajadorByEmailYPassword(email, contraseña);
      setNombre(trabajador.nombre);
      setApellidos(trabajador.apellidos);
      setDni(trabajador.dni);
      setDireccion(trabajador.direccion);
      setCodigoPostal(trabajador.codigo_postal);
      setPoblacion(trabajador.poblacion);
      setProvincia(trabajador.provincia);
      setCuentaCotizacion(trabajador.cuenta_cotizacion);
      setPuesto(trabajador.puesto);
      setTrabajadorActual(trabajador);
      setIsSignedIn(true);
      setPantalla("perfil");
      Alert.alert("Éxito", "Sesión del trabajador iniciada correctamente");
    } catch (error) {
      Alert.alert(
        "Error",
        "No se pudo iniciar sesión. Revisa tus credenciales.",
      );
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    try {
      const trabajador = await editarTrabajador(
        dni,
        nombre,
        apellidos,
        codigo_postal,
        direccion,
        poblacion,
        provincia,
        cuenta_cotizacion,
        puesto,
        email,
        contraseña,
      );
      setTrabajadorActual(trabajador);
      setIsSignedIn(true);
      setPantalla("perfil");
      Alert.alert("Éxito", "Información del perfil guardada correctamente");
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar la información del perfil.");
      console.error(error);
    }
  };

  if (pantalla === "inicio" && !isSignedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Iniciar sesión</Text>

        <TextInput
          placeholder="Email"
          style={styles.input}
          placeholderTextColor="#94A3B8"
        />

        <TextInput
          placeholder="Contraseña"
          secureTextEntry
          style={styles.input}
          placeholderTextColor="#94A3B8"
        />

        <ThemedView>
          <Pressable
            style={styles.signInButton}
            onPress={() => {
              handleSignIn();
              setPantalla("perfil");
            }}
          >
            <ThemedText type="subtitle" style={styles.buttonText}>
              Iniciar sesión
            </ThemedText>
          </Pressable>

          <Pressable
            style={styles.signInButton}
            onPress={() => setPantalla("registro")}
          >
            <ThemedText type="subtitle" style={styles.buttonText}>
              Registrarse
            </ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    );
  }

  if (pantalla === "registro" && !isSignedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Registrarse</Text>

        <TextInput
          placeholder="Nombre"
          style={styles.input}
          onChangeText={setNombre}
          placeholderTextColor="#94A3B8"
        />

        <TextInput
          placeholder="Apellidos"
          style={styles.input}
          onChangeText={setApellidos}
          placeholderTextColor="#94A3B8"
        />

        <TextInput
          placeholder="DNI"
          style={styles.input}
          onChangeText={setDni}
          placeholderTextColor="#94A3B8"
        />

        <TextInput
          placeholder="Dirección"
          style={styles.input}
          onChangeText={setDireccion}
          placeholderTextColor="#94A3B8"
        />

        <TextInput
          placeholder="Código Postal"
          style={styles.input}
          onChangeText={setCodigoPostal}
          placeholderTextColor="#94A3B8"
        />

        <TextInput
          placeholder="Población"
          style={styles.input}
          onChangeText={setPoblacion}
          placeholderTextColor="#94A3B8"
        />

        <TextInput
          placeholder="Provincia"
          style={styles.input}
          onChangeText={setProvincia}
          placeholderTextColor="#94A3B8"
        />

        <TextInput
          placeholder="Cuenta Cotización"
          style={styles.input}
          onChangeText={setCuentaCotizacion}
          placeholderTextColor="#94A3B8"
        />

        <TextInput
          placeholder="Puesto"
          style={styles.input}
          onChangeText={setPuesto}
          placeholderTextColor="#94A3B8"
        />

        <TextInput
          placeholder="Email"
          style={styles.input}
          onChangeText={setEmail}
          placeholderTextColor="#94A3B8"
        />

        <TextInput
          placeholder="Contraseña"
          secureTextEntry
          onChangeText={setContraseña}
          style={styles.input}
          placeholderTextColor="#94A3B8"
        />

        <TextInput
          placeholder="Confirmar contraseña"
          secureTextEntry
          onChangeText={setConfirmarContraseña}
          style={styles.input}
          placeholderTextColor="#94A3B8"
        />

        <ThemedView style={styles.buttonContainer}>
          <Pressable
            style={styles.signInButton}
            onPress={() => {
              handleRegister();
              setPantalla("perfil");
            }}
          >
            <ThemedText type="subtitle" style={styles.buttonText}>
              Registrarse
            </ThemedText>
          </Pressable>

          <Pressable
            style={styles.signInButton}
            onPress={() => setPantalla("inicio")}
          >
            <ThemedText type="subtitle" style={styles.buttonText}>
              Iniciar sesión
            </ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    );
  }

  if (pantalla === "perfil" && isSignedIn) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
        headerImage={
          <IconSymbol
            size={310}
            color="#808080"
            name="chevron.left.forwardslash.chevron.right"
            style={styles.headerImage}
          />
        }
      >
        <Text style={styles.title}>Perfil</Text>

        <View>
          <ThemedView style={[styles.profileContainer]}>
            <ThemedText type="subtitle" style={styles.profileTitle}>
              Información del Perfil
            </ThemedText>
            <ThemedText type="default" style={styles.profileText}>
              Nombre: {nombre}
            </ThemedText>
            <ThemedText type="default" style={styles.profileText}>
              Apellidos: {apellidos}
            </ThemedText>
            <ThemedText type="default" style={styles.profileText}>
              DNI: {dni}
            </ThemedText>
            <ThemedText type="default" style={styles.profileText}>
              Dirección: {direccion}
            </ThemedText>
            <ThemedText type="default" style={styles.profileText}>
              Código postal: {codigo_postal}
            </ThemedText>
            <ThemedText type="default" style={styles.profileText}>
              Poblacion: {poblacion}
            </ThemedText>
            <ThemedText type="default" style={styles.profileText}>
              Provincia: {provincia}
            </ThemedText>
            <ThemedText type="default" style={styles.profileText}>
              Cuenta de cotización: {cuenta_cotizacion}
            </ThemedText>
            <ThemedText type="default" style={styles.profileText}>
              Puesto: {puesto}
            </ThemedText>
            <ThemedText type="default" style={styles.profileText}>
              Email: {email}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.buttonContainer}>
            <Pressable
              style={styles.signOutButton}
              onPress={() => setPantalla("editar")}
            >
              <ThemedText type="subtitle" style={styles.buttonText}>
                Editar perfil
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.signOutButton}
              onPress={() => {
                handleSignOut();
                setPantalla("registro");
              }}
            >
              <ThemedText type="subtitle" style={styles.buttonText}>
                Cerrar sesión
              </ThemedText>
            </Pressable>
          </ThemedView>
        </View>
      </ParallaxScrollView>
    );
  }

  if (pantalla === "editar" && isSignedIn) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
        headerImage={
          <IconSymbol
            size={310}
            color="#808080"
            name="chevron.left.forwardslash.chevron.right"
            style={styles.headerImage}
          />
        }
      >
        <Text style={styles.title}>Editar perfil</Text>

        <View>
          <ThemedView style={styles.formContainer}>
            <ThemedText type="default" style={styles.label}>
              Nombre
            </ThemedText>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              style={styles.input}
            />
            <ThemedText type="default" style={styles.label}>
              Apellidos
            </ThemedText>
            <TextInput
              value={apellidos}
              onChangeText={setApellidos}
              style={styles.input}
            />
            <ThemedText type="default" style={styles.label}>
              DNI
            </ThemedText>
            <TextInput value={dni} onChangeText={setDni} style={styles.input} />
            <ThemedText type="default" style={styles.label}>
              Dirección
            </ThemedText>
            <TextInput
              value={direccion}
              onChangeText={setDireccion}
              style={styles.input}
            />
            <ThemedText type="default" style={styles.label}>
              Código postal
            </ThemedText>
            <TextInput
              value={codigo_postal}
              onChangeText={setCodigoPostal}
              style={styles.input}
            />
            <ThemedText type="default" style={styles.label}>
              Población
            </ThemedText>
            <TextInput
              value={poblacion}
              onChangeText={setPoblacion}
              style={styles.input}
            />
            <ThemedText type="default" style={styles.label}>
              Provincia
            </ThemedText>
            <TextInput
              value={provincia}
              onChangeText={setProvincia}
              style={styles.input}
            />
            <ThemedText type="default" style={styles.label}>
              Cuenta de cotización
            </ThemedText>
            <TextInput
              value={cuenta_cotizacion}
              onChangeText={setCuentaCotizacion}
              style={styles.input}
            />
            <ThemedText type="default" style={styles.label}>
              Puesto
            </ThemedText>
            <TextInput
              value={puesto}
              onChangeText={setPuesto}
              style={styles.input}
            />
          </ThemedView>

          <Pressable
            style={styles.signInButton}
            onPress={() => {
              handleSubmit();
              setPantalla("perfil");
            }}
          >
            <ThemedText type="subtitle" style={styles.buttonText}>
              Guardar cambios
            </ThemedText>
          </Pressable>
        </View>
      </ParallaxScrollView>
    );
  }
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },

  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  formContainer: {
    padding: 20,
    backgroundColor: "#F3E5F5",
    borderRadius: 10,
    margin: 10,
    borderWidth: 1,
    borderColor: "#CE93D8",
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 32,
  },

  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 10,
    color: "#333",
  },

  input: {
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 16,
  },

  button: {
    height: 56,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  buttonText: {
    color: "white",
    fontSize: 18,
  },

  signInButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    margin: 10,
  },
  signOutButton: {
    backgroundColor: "#FF3B30",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    margin: 10,
  },

  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 10,
  },

  profileContainer: {
    padding: 20,
    backgroundColor: "#E8F5E8",
    borderRadius: 10,
    margin: 10,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },

  profileTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },

  profileText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
  },
});
