import {
    agregarEmpresa,
    // crearEmpresa,
    obtenerEmpresasTrabajador,
} from "@/components/models/types";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/theme";
import { useTrabajador } from "@/context/TrabajadorContext";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput } from "react-native";

export default function VerEmpresas() {
  const trabajador = useTrabajador().trabajadorActual;
  const trabajadorId = trabajador?.id || 0;
  const [empresas, setEmpresas] = useState(
    obtenerEmpresasTrabajador(trabajador?.id || 0),
  );
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCif, setNuevoCif] = useState("");
  const { setEmpresaSeleccionada } = useTrabajador();

  //   const agregarEmpresa = () => {
  //     if (nuevoNombre && nuevoCif) {
  //       const nuevaEmpresa = crearEmpresa(nuevoNombre, nuevoCif);
  //       setEmpresas([...empresas, nuevaEmpresa]);
  //       setNuevoNombre("");
  //       setNuevoCif("");
  //     }
  //   };

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
          Empresas
        </ThemedText>
      </ThemedView>
      <ThemedText>Empresas en las que trabajas.</ThemedText>
      <ThemedView style={styles.addContainer}>
        <ThemedText>Agregar nueva empresa:</ThemedText>
        <TextInput
          placeholder="Nombre de la empresa"
          value={nuevoNombre}
          onChangeText={setNuevoNombre}
          style={styles.input}
        />
        <TextInput
          placeholder="CIF"
          value={nuevoCif}
          onChangeText={setNuevoCif}
          style={styles.input}
        />
        <Pressable
          style={styles.button}
          onPress={() => {
            if (trabajadorId === 0) {
              alert("No se ha iniciado sesión.");
            } else {
              agregarEmpresa(trabajadorId, nuevoNombre, nuevoCif);
              setNuevoNombre("");
              setNuevoCif("");
            }
          }}
        >
          <ThemedText type="subtitle">Agregar Empresa</ThemedText>
        </Pressable>
      </ThemedView>
      <ThemedView style={styles.listContainer}>
        {empresas.map((empresa) => (
          <ThemedView key={empresa.id} style={styles.empresaCard}>
            <ThemedText type="default" style={styles.empresaText}>
              {empresa.nombre} - {empresa.cif}
            </ThemedText>
            <ThemedView style={styles.buttonContainer}>
              <Pressable
                onPress={() => {
                  setEmpresas(empresas.filter((e) => e.id !== empresa.id));
                }}
                style={styles.deleteButton}
              >
                <ThemedText style={styles.buttonText}>Eliminar</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setEmpresaSeleccionada(empresa)}
                style={styles.selectButton}
              >
                <ThemedText style={styles.buttonText}>Seleccionar</ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        ))}
      </ThemedView>
      <Link href="/" asChild>
        <Pressable style={styles.button}>
          <ThemedText type="subtitle">Volver</ThemedText>
        </Pressable>
      </Link>
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
    gap: 8,
  },
  link: {
    marginTop: 16,
  },
  empresa: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#E0E0E0",
    marginBottom: 8,
    color: "#333",
  },
  listContainer: {
    marginTop: 16,
  },
  empresaCard: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#FFF3E0",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FFCC80",
  },
  empresaText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignItems: "center",
  },
  selectButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    alignItems: "flex-start",
    marginTop: 16,
  },
  addContainer: {
    marginTop: 16,
    gap: 8,
  },
  input: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    backgroundColor: "#fff",
  },
});
