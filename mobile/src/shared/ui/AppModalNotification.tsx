import { ThemedText } from "@/src/shared/components/ThemedText";
import React, { createContext, useContext, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

type TipoModal = "mensaje" | "error";

interface ModalContextType {
  mostrarMensaje: (titulo: string, mensaje: string) => void;
  mostrarError: (error: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const AppModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [tipo, setTipo] = useState<TipoModal>("mensaje");
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");

  const mostrarMensaje = (nuevoTitulo: string, nuevoMensaje: string) => {
    setTipo("mensaje");
    setTitulo(nuevoTitulo);
    setMensaje(nuevoMensaje);
    setVisible(true);
  };

  const mostrarError = (nuevoError: string) => {
    setTipo("error");
    setTitulo("Error");
    setMensaje(nuevoError);
    setVisible(true);
  };

  const cerrarModal = () => {
    setVisible(false);
  };

  return (
    <ModalContext.Provider value={{ mostrarMensaje, mostrarError }}>
      {children}

      {/* Cuadro flotante / Modal personalizado propio de la app */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={cerrarModal}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {/* Cabecera / Título con color dinámico (Rojo para error, Azul/Verde para mensaje) */}
            <ThemedText
              style={[
                styles.titulo,
                tipo === "error" ? styles.textoError : styles.textoMensaje,
              ]}
            >
              {titulo}
            </ThemedText>

            {/* Contenido / Descripción */}
            <ThemedText style={styles.mensaje}>{mensaje}</ThemedText>

            {/* Botón de aceptación propio */}
            <Pressable
              style={[
                styles.boton,
                tipo === "error" ? styles.botonError : styles.botonMensaje,
              ]}
              onPress={cerrarModal}
            >
              <ThemedText style={styles.textoBoton}>Aceptar</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ModalContext.Provider>
  );
};

// Hook personalizado para usar las funciones en cualquier pantalla o componente
export const useAppModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useAppModal debe ser usado dentro de un AppModalProvider");
  }
  return context;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Fondo semitransparente oscuro
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8, // Sombra para Android
  },
  titulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  textoError: {
    color: "#DC2626", // Rojo fuerte para errores
  },
  textoMensaje: {
    color: "#0284C7", // Azul corporativo para mensajes informativos
  },
  mensaje: {
    fontSize: 15,
    color: "#374151",
    marginBottom: 24,
    lineHeight: 22,
  },
  boton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  botonError: {
    backgroundColor: "#DC2626",
  },
  botonMensaje: {
    backgroundColor: "#0284C7",
  },
  textoBoton: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
