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
import { useTrabajador } from "../../../modules/trabajadores/store/TrabajadorContext";
import { ThemedText } from "../../../shared/components/themed-text";

export const EmpresaSelector = () => {
  const [showModal, setShowModal] = useState(false);
  const { empresaSeleccionada, empresas, seleccionarEmpresa } = useTrabajador();

  const handleSelectEmpresa = (empresa: Empresa) => {
    seleccionarEmpresa(empresa);
    useFichajeStore.getState().setEmpresa(empresa.id);
    setShowModal(false);
  };

  return (
    <>
      <Pressable style={styles.button} onPress={() => setShowModal(true)}>
        <View style={styles.contenedor}>
          <ThemedText style={styles.label}>
            {empresaSeleccionada?.nombre || "Seleccionar empresa"}
          </ThemedText>
          <ThemedText style={styles.chevron}>▼</ThemedText>
        </View>
      </Pressable>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>
              Seleccionar empresa
            </ThemedText>
            <Pressable onPress={() => setShowModal(false)}>
              <ThemedText style={styles.closeButton}>✕</ThemedText>
            </Pressable>
          </View>

          <FlatList
            data={empresas}
            keyExtractor={(item: Empresa) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.empresaItem,
                  empresaSeleccionada?.id === item.id &&
                    styles.empresaItemSelected,
                ]}
                onPress={() => handleSelectEmpresa(item)}
              >
                <View style={styles.radio}>
                  {empresaSeleccionada?.id === item.id && (
                    <View style={styles.radioBullet} />
                  )}
                </View>
                <ThemedText style={styles.empresaNombre}>
                  {item.nombre}
                </ThemedText>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
  },
  contenedor: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  chevron: {
    fontSize: 12,
    color: "#64748B",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeButton: {
    fontSize: 24,
    color: "#64748B",
  },
  empresaItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  empresaItemSelected: {
    backgroundColor: "#F0F9FF",
  },
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
  radioBullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2563EB",
  },
  empresaNombre: {
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "500",
  },
});
