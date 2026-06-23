import React, { useState } from "react";
import {
    FlatList,
    Modal,
    Pressable,
    SafeAreaView,
    StyleSheet,
    View,
} from "react-native";
import { Empresa } from "../../../modules/empresas/types/empresa";
import { useFichajeStore } from "../../../modules/fichajes/store/useFichajeStore";
import { ThemedText } from "../../../shared/components/themed-text";
import { useTrabajador } from "../../trabajadores/store/UsuarioContext";

/**
 * Componente interactivo que despliega una ventana modal con el listado de empresas.
 * Permite al empleado cambiar la organización activa para sincronizar sus fichajes y turnos.
 */
export const EmpresaSelector = () => {
  // Estado local para abrir (true) o cerrar (false) la ventana emergente modal
  const [showModal, setShowModal] = useState(false);

  // Extrae los datos y las utilidades globales del contexto de sesión del trabajador
  const { empresaSeleccionada, empresas, seleccionarEmpresa } = useTrabajador();

  /**
   * Procesa la selección de una nueva empresa del listado.
   * Actualiza el contexto global, sincroniza el almacén de Zustand y cierra la modal.
   *
   * @param empresa - El objeto de la empresa que ha pulsado el usuario.
   */
  const handleSelectEmpresa = (empresa: Empresa) => {
    seleccionarEmpresa(empresa); // Modifica la empresa activa en el contexto general
    useFichajeStore.getState().setEmpresa(empresa.id); // Notifica al almacén de fichajes para recargar el día
    setShowModal(false); // Oculta la ventana emergente
  };

  return (
    <>
      {/* Botón principal visible en la interfaz que muestra la empresa activa actual */}
      <Pressable style={styles.button} onPress={() => setShowModal(true)}>
        <View style={styles.contenedor}>
          <ThemedText style={styles.label}>
            {empresaSeleccionada?.nombre || "Seleccionar empresa"}
          </ThemedText>
          <ThemedText style={styles.chevron}>▼</ThemedText>
        </View>
      </Pressable>

      {/* Ventana emergente que contiene el listado completo de opciones disponibles */}
      <Modal
        visible={showModal}
        animationType="slide" // Despliega la animación de abajo hacia arriba de forma nativa
        transparent={true}
        onRequestClose={() => setShowModal(false)} // Gestión del botón nativo de volver en Android
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Encabezado interno de la ventana emergente */}
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>
              Seleccionar empresa
            </ThemedText>
            <Pressable onPress={() => setShowModal(false)}>
              <ThemedText style={styles.closeButton}>✕</ThemedText>
            </Pressable>
          </View>

          {/* Lista de alto rendimiento optimizada para renderizar los elementos */}
          <FlatList
            data={empresas}
            keyExtractor={(item: Empresa) => String(item.id)}
            renderItem={({ item }) => {
              // Comprobación de seguridad para identificar si el elemento coincide con el activo
              const isSelected = empresaSeleccionada?.id === item.id;

              return (
                <Pressable
                  style={[
                    styles.empresaItem,
                    isSelected && styles.empresaItemSelected, // Aplica un fondo azul tenue si está activa
                  ]}
                  onPress={() => handleSelectEmpresa(item)}
                >
                  {/* Botón circular indicador de tipo radio button */}
                  <View style={styles.radio}>
                    {isSelected && (
                      <View style={styles.radioBullet} /> // Pinta el punto interno azul si está marcado
                    )}
                  </View>
                  <ThemedText style={styles.empresaNombre}>
                    {item.nombre}
                  </ThemedText>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Botón disparador de la cabecera, fondo blanco puro, bordes finos de color gris claro y esquinas redondeadas
  button: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
  },
  // Distribución del botón principal, alinea elementos en horizontal y los separa de forma simétrica a los extremos
  contenedor: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  // Texto descriptivo de la organización activa, tamaño 16, grosor medio y tono azul marino oscuro
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  // Flecha indicadora de despliegue inferior, tamaño compacto y color azul grisáceo tenue
  chevron: {
    fontSize: 12,
    color: "#64748B",
  },
  // Contenedor base de la ventana modal, se expande al máximo de pantalla con un fondo gris claro limpio
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  // Encabezado de la ventana emergente, ordena horizontalmente, separa extremos y delimita con un borde inferior
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  // Título superior interno de la modal, tamaño 18, negrita de gran grosor y color oscuro
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  // Botón de aspa para cerrar el cuadro flotante, tamaño aumentado a 24 para facilitar el toque táctil
  closeButton: {
    fontSize: 24,
    color: "#64748B",
  },
  // Fila interactiva de la lista de corporaciones, alineación horizontal centrada y separación por borde inferior fino
  empresaItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  // Modificador opcional para el elemento activo de la lista, añade un fondo de color azul celeste muy suave
  empresaItemSelected: {
    backgroundColor: "#F0F9FF",
  },
  // Aro exterior del indicador de selección circular, tamaño fijo 24, borde azul brillante y centrado absoluto
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  // Punto interno del indicador circular, dimensiones fijas a mitad de tamaño y fondo azul brillante
  radioBullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2563EB",
  },
  // Texto con la razón social o nombre de la organización, tamaño estándar 16 y peso de grosor intermedio
  empresaNombre: {
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "500",
  },
});
