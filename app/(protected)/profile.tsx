import { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import ParallaxScrollView from "../../components/parallax-scroll-view";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { Fonts } from "../../constants/theme";
import { useTrabajador } from "../../context/TrabajadorContext";
import { ficharTrabajador } from "../../services/fichajesService";
import {
  crearTrabajador,
  editarTrabajador,
  getTrabajadorByEmailYPassword,
} from "../../services/trabajadoresService";

interface Fichaje {
  tipo: string;
  fecha: string;
}

export default function VerPerfil() {
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
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
    setFichajes([]);
    Alert.alert("Sesión cerrada", "Has cerrado sesión correctamente");
  };

  const handleRegister = async () => {
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

  const handleFichar = async (tipo: string) => {
    try {
      const nuevoFichaje = await ficharTrabajador(tipo);
      setFichajes([...fichajes, nuevoFichaje]);
      Alert.alert("Éxito", `Fichaje de ${tipo} registrado correctamente.`);
    } catch (error) {
      Alert.alert("Error", "No se pudo registrar el fichaje.");
      console.error(error);
    }
  };

  if (pantalla === "registro" && !isSignedIn) {
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
        <ThemedView style={styles.titleContainer}>
          <ThemedText
            type="title"
            style={{
              fontFamily: Fonts.rounded,
              backgroundColor: "#E0E0E0",
              color: "#000000",
            }}
          >
            Registro
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.formContainer}>
          <ThemedText type="default" style={styles.label}>
            Nombre
          </ThemedText>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            style={styles.input}
            placeholder="Ingresa tu nombre"
          />

          <ThemedText type="default" style={styles.label}>
            Apellidos
          </ThemedText>
          <TextInput
            value={apellidos}
            onChangeText={setApellidos}
            style={styles.input}
            placeholder="Ingresa tus apellidos"
          />

          <ThemedText type="default" style={styles.label}>
            DNI
          </ThemedText>
          <TextInput
            value={dni}
            onChangeText={setDni}
            style={styles.input}
            placeholder="Ingresa tu DNI"
          />

          <ThemedText type="default" style={styles.label}>
            Dirección
          </ThemedText>
          <TextInput
            value={direccion}
            onChangeText={setDireccion}
            style={styles.input}
            placeholder="Ingresa tu dirección"
          />

          <ThemedText type="default" style={styles.label}>
            Código Postal
          </ThemedText>
          <TextInput
            value={codigo_postal}
            onChangeText={setCodigoPostal}
            style={styles.input}
            placeholder="Ingresa tu código postal"
          />

          <ThemedText type="default" style={styles.label}>
            Población
          </ThemedText>
          <TextInput
            value={poblacion}
            onChangeText={setPoblacion}
            style={styles.input}
            placeholder="Ingresa tu población"
          />

          <ThemedText type="default" style={styles.label}>
            Provincia
          </ThemedText>
          <TextInput
            value={provincia}
            onChangeText={setProvincia}
            style={styles.input}
            placeholder="Ingresa tu provincia"
          />

          <ThemedText type="default" style={styles.label}>
            Cuenta de cotización
          </ThemedText>
          <TextInput
            value={cuenta_cotizacion}
            onChangeText={setCuentaCotizacion}
            style={styles.input}
            placeholder="Ingresa tu cuenta de cotización"
          />

          <ThemedText type="default" style={styles.label}>
            Puesto
          </ThemedText>
          <TextInput
            value={puesto}
            onChangeText={setPuesto}
            style={styles.input}
            placeholder="Ingresa tu puesto"
          />

          <ThemedText type="default" style={styles.label}>
            Email
          </ThemedText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={styles.input}
            placeholder="Ingresa tu email"
          />

          <ThemedText type="default" style={styles.label}>
            Contraseña
          </ThemedText>
          <TextInput
            value={contraseña}
            onChangeText={setContraseña}
            secureTextEntry
            style={styles.input}
            placeholder="Ingresa tu contraseña"
          />

          <ThemedText type="default" style={styles.label}>
            Confirmar contraseña
          </ThemedText>
          <TextInput
            value={contraseña}
            onChangeText={setContraseña}
            secureTextEntry
            style={styles.input}
            placeholder="Confirma tu contraseña"
          />
        </ThemedView>

        <ThemedView style={styles.buttonContainer}>
          <Pressable style={styles.signInButton} onPress={handleRegister}>
            <ThemedText type="subtitle" style={styles.buttonText}>
              Registrarse
            </ThemedText>
          </Pressable>
          <Pressable
            style={styles.signInButton}
            onPress={() => setPantalla("inicio")}
          >
            <ThemedText type="subtitle" style={styles.buttonText}>
              Ya tengo cuenta
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  if (pantalla === "inicio" && !isSignedIn) {
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
        <ThemedView style={styles.titleContainer}>
          <ThemedText
            type="title"
            style={{
              fontFamily: Fonts.rounded,
              backgroundColor: "#E0E0E0",
              color: "#000000",
            }}
          >
            Iniciar sesión
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.formContainer}>
          <ThemedText type="default" style={styles.label}>
            Email
          </ThemedText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={styles.input}
            placeholder="Ingresa tu email"
          />

          <ThemedText type="default" style={styles.label}>
            Contraseña
          </ThemedText>
          <TextInput
            value={contraseña}
            onChangeText={setContraseña}
            secureTextEntry
            style={styles.input}
            placeholder="Ingresa tu contraseña"
          />
        </ThemedView>

        <ThemedView style={styles.buttonContainer}>
          <Pressable style={styles.signInButton} onPress={handleSignIn}>
            <ThemedText type="subtitle" style={styles.buttonText}>
              Iniciar sesión
            </ThemedText>
          </Pressable>
          <Pressable
            style={styles.signInButton}
            onPress={() => setPantalla("registro")}
          >
            <ThemedText type="subtitle" style={styles.buttonText}>
              No tengo cuenta
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ParallaxScrollView>
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
        <ThemedView style={styles.titleContainer}>
          <ThemedText
            type="title"
            style={{
              fontFamily: Fonts.rounded,
              backgroundColor: "#E0E0E0",
              color: "#000000",
            }}
          >
            Perfil
          </ThemedText>
        </ThemedView>

        <View>
          <ThemedView style={styles.profileContainer}>
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
              Población: {poblacion}
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
              onPress={() => handleFichar("entrada")}
            >
              <ThemedText type="subtitle" style={styles.buttonText}>
                Fichar Entrada
              </ThemedText>
            </Pressable>
            <Pressable
              style={styles.signOutButton}
              onPress={() => handleFichar("salida")}
            >
              <ThemedText type="subtitle" style={styles.buttonText}>
                Fichar Salida
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.historyContainer}>
            <ThemedText type="subtitle" style={styles.historyTitle}>
              Historial de Fichajes
            </ThemedText>
            {fichajes.map((fichaje, index) => (
              <ThemedText key={index} type="default" style={styles.historyText}>
                {fichaje.tipo} - {fichaje.fecha}
              </ThemedText>
            ))}
          </ThemedView>

          <ThemedView style={styles.buttonContainer}>
            <Pressable
              style={styles.signOutButton}
              onPress={() => {
                handleSignOut();
                setPantalla("inicio");
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
        <ThemedView style={styles.titleContainer}>
          <ThemedText
            type="title"
            style={{
              fontFamily: Fonts.rounded,
              backgroundColor: "#E0E0E0",
              color: "#000000",
            }}
          >
            Editar
          </ThemedText>
        </ThemedView>

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

          <Pressable style={styles.signInButton} onPress={handleSubmit}>
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
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 10,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 5,
    padding: 10,
    backgroundColor: "#FFF",
    fontSize: 16,
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
  buttonText: {
    color: "white",
    fontSize: 18,
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
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
  historyText: {
    fontSize: 14,
    color: "#000",
    marginBottom: 5,
  },
  historyContainer: {
    padding: 20,
    backgroundColor: "#F3E5F5",
    borderRadius: 10,
    margin: 10,
    borderWidth: 1,
    borderColor: "#CE93D8",
  },
});
