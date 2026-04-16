import { Alert, Pressable, StyleSheet, TextInput } from "react-native";

import { crearTrabajador } from "@/components/models/types";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/theme";
import { useTrabajador } from "@/context/TrabajadorContext";
import { useState } from "react";

export default function EnterProfile() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [puesto, setPuesto] = useState("");
  const [email, setEmail] = useState("");
  const [contraseña, setContraseña] = useState("");
  const { setTrabajadorActual } = useTrabajador();

  const handleSignOut = () => {
    setIsSignedIn(false);
    setNombre("");
    setDni("");
    setPuesto("");
    setEmail("");
    setContraseña("");
    Alert.alert("Sesión cerrada", "Has cerrado sesión correctamente");
  };

  const handleSignIn = () => {
    const trabajador = crearTrabajador(nombre, dni, puesto, email, contraseña);
    setTrabajadorActual(trabajador);
    Alert.alert("Éxito", "Sesión del trabajador iniciada correctamente");
    setIsSignedIn(true);
  };

  // const handleSubmit = () => {
  //   const trabajador = crearTrabajador(nombre, dni, puesto, email, contraseña);
  //   setTrabajadorActual(trabajador);
  //   Alert.alert("Éxito", "Información del perfil guardada correctamente");
  //   setIsSignedIn(true);
  // };

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

      {!isSignedIn ? (
        <>
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
          </ThemedView>

          <Pressable style={styles.signInButton} onPress={handleSignIn}>
            <ThemedText type="subtitle" style={styles.buttonText}>
              Iniciar sesión
            </ThemedText>
          </Pressable>
        </>
      ) : (
        <>
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

          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <ThemedText type="subtitle" style={styles.buttonText}>
              Cerrar sesión
            </ThemedText>
          </Pressable>
        </>
      )}
    </ParallaxScrollView>
  );
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
});
