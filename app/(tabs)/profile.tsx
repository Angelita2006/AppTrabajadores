import { StyleSheet, TextInput } from "react-native";

import { crearTrabajador } from "@/components/models/types";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/theme";
import { useState } from "react";

export default function EnterProfile() {
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [puesto, setPuesto] = useState("");
  const [email, setEmail] = useState("");
  const [contraseña, setContraseña] = useState("");

  const handleSubmit = () => {
    crearTrabajador(nombre, dni, puesto);
  };

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
          }}
        >
          Perfil
        </ThemedText>
      </ThemedView>

      <ThemedText type="default">
        Nombre completo
        <br></br>
        <TextInput
          placeholder="Nombre completo"
          value={nombre}
          onChangeText={setNombre}
        />
        DNI
        <br></br>
        <TextInput placeholder="DNI" value={dni} onChangeText={setDni} />
        Puesto
        <br></br>
        <TextInput
          placeholder="Puesto"
          value={puesto}
          onChangeText={setPuesto}
        />
        Email
        <br></br>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        Contraseña
        <br></br>
        <TextInput
          placeholder="Contraseña"
          value={contraseña}
          onChangeText={setContraseña}
          secureTextEntry
        />
      </ThemedText>

      <ThemedText type="default" onPress={handleSubmit}>
        Guardar información
      </ThemedText>
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
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
