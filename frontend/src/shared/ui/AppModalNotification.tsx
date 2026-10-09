import { ThemedText } from "@/src/shared/components/ThemedText";
import React, { createContext, useContext, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";

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
  const [tipo, setTipo] = useState("mensaje");
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

  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    // Solo ejecutamos lógica de DOM si estamos en la Web
    if (Platform.OS === "web") {
      // 1. Buscamos si ya existe nuestro contenedor de alertas prioritarias
      let node = document.getElementById(
        "app-high-priority-alerts-root",
      ) as HTMLDivElement;

      if (!node) {
        // 2. Si no existe, lo creamos dinámicamente
        node = document.createElement("div");
        node.id = "app-high-priority-alerts-root";

        // 3. Forzamos un estilo CSS en línea ultra-agresivo para producción
        node.style.position = "fixed";
        node.style.top = "0";
        node.style.left = "0";
        node.style.width = "100vw";
        node.style.height = "100vh";
        node.style.zIndex = "999999999"; // Rompe cualquier stacking context de producción
        node.style.pointerEvents = "none"; // Evita bloquear la app si está oculto

        document.body.appendChild(node);
      }

      setPortalNode(node);
    }
  }, []);

  // Estructura del modal (Sigue igual que antes)
  const componenteModal = (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={cerrarModal}
    >
      {/* Añadimos pointerEvents: 'auto' aquí para que el modal sí reciba clicks */}
      <View
        style={[
          styles.overlay,
          Platform.OS === "web" && ({ pointerEvents: "auto" } as any),
        ]}
      >
        <View style={styles.modalContainer}>
          <ThemedText
            style={[
              styles.titulo,
              tipo === "error" ? styles.textoError : styles.textoMensaje,
            ]}
          >
            {titulo}
          </ThemedText>
          <ThemedText style={styles.mensaje}>{mensaje}</ThemedText>
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
  );

  const renderModal = () => {
    if (!visible) return null;

    if (Platform.OS === "web") {
      // Si el nodo aún no está listo en el DOM, esperamos
      if (!portalNode) return null;

      // En vez de inyectarlo al body libre, lo metemos en nuestro contenedor blindado
      return ReactDOM.createPortal(componenteModal, portalNode);
    }

    return componenteModal;
  };

  return (
    <ModalContext.Provider value={{ mostrarMensaje, mostrarError }}>
      {children}
      {renderModal()}
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
  rootContainer: {
    flex: 1,
    position: "relative",
  },
  overlay: {
    ...Platform.select({
      web: {
        position: "fixed" as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
      default: {
        ...StyleSheet.absoluteFillObject,
      },
    }),
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 2147483647, // Valor máximo absoluto permitido para zIndex en navegadores web
    elevation: 99999,
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
