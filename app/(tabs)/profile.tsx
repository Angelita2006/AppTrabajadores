import {
  crearTrabajador,
  getTrabajadorByEmailYContraseña,
  updateTrabajador,
} from "@/components/models/types";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/theme";
import { useTrabajador } from "@/context/TrabajadorContext";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
// Componente VerPerfil que muestra la información del perfil del trabajador actual y permite iniciar o cerrar sesión. Utiliza el contexto
// del trabajador para acceder a la información del trabajador actual y actualizarla al iniciar sesión.
// El componente muestra un formulario para ingresar el nombre, DNI, puesto, email y contraseña del trabajador cuando no hay una sesión iniciada.
// Al hacer clic en el botón "Iniciar sesión", se crea un nuevo trabajador con la información ingresada y se actualiza el contexto con el
// trabajador actual. Si ya hay una sesión iniciada, se muestra la información del perfil y un botón para cerrar sesión, que restablece el estado
// y muestra una alerta de cierre de sesión exitoso.
export default function VerPerfil() {
  const [pantalla, setPantalla] = useState<
    "registro" | "inicio" | "perfil" | "editar"
  >("inicio");

  const { setTrabajadorActual } = useTrabajador();
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [puesto, setPuesto] = useState("");
  const [email, setEmail] = useState("");
  const [contraseña, setContraseña] = useState("");

  const handleSignOut = () => {
    setIsSignedIn(false);
    setNombre("");
    setDni("");
    setPuesto("");
    setEmail("");
    setContraseña("");
    Alert.alert("Sesión cerrada", "Has cerrado sesión correctamente");
  };

  const handleRegister = () => {
    const trabajador = crearTrabajador(nombre, dni, puesto, email, contraseña);
    setTrabajadorActual(trabajador);
    Alert.alert("Éxito", "Registro del trabajador completado correctamente");
    setIsSignedIn(true);
  };

  const handleSignIn = async () => {
    let trabajador = getTrabajadorByEmailYContraseña(email, contraseña);
    setNombre((await trabajador).nombre);
    setDni((await trabajador).dni);
    setPuesto((await trabajador).puesto);
    setTrabajadorActual(await trabajador);
    Alert.alert("Éxito", "Sesión del trabajador iniciada correctamente");
    setIsSignedIn(true);
  };

  const handleSubmit = () => {
    const trabajador = updateTrabajador(nombre, dni, puesto, email, contraseña);
    setTrabajadorActual(trabajador);
    Alert.alert("Éxito", "Información del perfil guardada correctamente");
    setIsSignedIn(true);
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
            Nombre completo
          </ThemedText>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            style={styles.input}
            placeholder="Ingresa tu nombre"
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
          <ThemedView style={[styles.profileContainer]}>
            <ThemedText type="subtitle" style={styles.profileTitle}>
              Información del Perfil
            </ThemedText>
            <ThemedText type="default" style={styles.profileText}>
              Nombre: {nombre}
            </ThemedText>
            <ThemedText type="default" style={styles.profileText}>
              DNI: {dni}
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
              placeholder="Ingresa tu nombre"
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
              Puesto
            </ThemedText>
            <TextInput
              value={puesto}
              onChangeText={setPuesto}
              style={styles.input}
              placeholder="Ingresa tu puesto"
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
  // Estilo para la imagen de fondo del header, que se posiciona de manera absoluta para crear el efecto parallax, y
  // tiene un color gris para simular una imagen de fondo.
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  // Estilo para el contenedor del título de cada sección, que organiza el título en una fila con un icono y un fondo claro para
  // destacar el título.
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  // Estilo para el contenedor del formulario de registro e inicio de sesión, que tiene un fondo claro, bordes redondeados y
  // un borde de color para resaltar la sección del formulario.
  formContainer: {
    padding: 20,
    backgroundColor: "#F3E5F5",
    borderRadius: 10,
    margin: 10,
    borderWidth: 1,
    borderColor: "#CE93D8",
  },
  // Estilo para las etiquetas de los campos del formulario, que tienen un tamaño de fuente más grande, negrita y
  // un margen para separarlas de los campos de entrada.
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 10,
    color: "#333",
  },
  // Estilo para los campos de entrada de texto, que tienen un borde, fondo blanco, padding y un tamaño de fuente legible.
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 5,
    padding: 10,
    backgroundColor: "#FFF",
    fontSize: 16,
  },
  // Estilo para el botón de iniciar sesión, que tiene un fondo azul para indicar una acción de inicio de sesión, y
  // un estilo similar al botón de cerrar sesión para mantener la coherencia visual.
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
  // Estilo para el contenedor de los botones de cada empresa, que organiza los botones en una fila con espacio entre ellos.
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 10,
  },
  // Estilo para el texto de los botones, que define el color y el tamaño de fuente.
  buttonText: {
    color: "white",
    fontSize: 18,
  },
  // Estilo para el contenedor del perfil, que tiene un fondo claro, bordes redondeados y un borde de color para resaltar
  // la sección de información del perfil.
  profileContainer: {
    padding: 20,
    backgroundColor: "#E8F5E8",
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
});
