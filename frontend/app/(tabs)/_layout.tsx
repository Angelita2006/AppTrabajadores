import { AppModalProvider } from "@/src/shared/ui/AppModalNotification";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSesion } from "../../src/modules/usuarios/store/SesionContextZustand";
import { ThemedText } from "../../src/shared/components/ThemedText";
import { IconSymbol } from "../../src/shared/ui/IconSymbol";

export default function RootLayout() {
  const { usuarioActual } = useSesion();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const tieneSesion = usuarioActual !== null;

  // Clasificación de roles
  const esAdmin =
    usuarioActual?.tipo_usuario === "Admin_empresa" ||
    usuarioActual?.tipo_usuario === "Admin_gestoría";

  const esRrhh = usuarioActual?.tipo_usuario === "Rrhh";
  const esTrabajador = usuarioActual?.tipo_usuario === "Trabajador";
  const esInspectorOVisualizador =
    usuarioActual?.tipo_usuario === "Auditor_itss" ||
    usuarioActual?.tipo_usuario === "Representante_legal";

  // Definir las pantallas disponibles según el rol
  const pantallasDisponibles = [
    {
      name: "fichar",
      title: "Fichar",
      show: tieneSesion && (esTrabajador || esRrhh),
      icon: "house.fill",
    },
    {
      name: "perfil",
      title: tieneSesion ? "Perfil" : "Login",
      show: tieneSesion,
      icon: "person",
    },
    {
      name: "empresa",
      title: "Empresa",
      show: tieneSesion && (esAdmin || esRrhh),
      icon: "briefcase.fill",
    },
    {
      name: "horarios",
      title: "Horarios",
      show: tieneSesion && (esTrabajador || esRrhh),
      icon: "schedule",
    },
    {
      name: "fichajes",
      title: "Registro",
      show: tieneSesion && (esAdmin || esRrhh || esInspectorOVisualizador),
      icon: "folder",
    },
    {
      name: "incidencias",
      title: "Incidencias",
      show: tieneSesion && esTrabajador,
      icon: "warning",
    },
    {
      name: "gestion-incidencias",
      title: "Gestión Incidencias",
      show: tieneSesion && (esAdmin || esRrhh),
      icon: "warning",
    },
    {
      name: "ausencias",
      title: "Ausencias",
      show: tieneSesion && esTrabajador,
      icon: "event",
    },
    {
      name: "gestion-ausencias",
      title: "Gestión Ausencias",
      show: tieneSesion && (esAdmin || esRrhh),
      icon: "event",
    },
  ].filter((p) => p.show);

  return (
    <AppModalProvider>
      <Stack
        screenOptions={{
          headerShown: tieneSesion,
          headerRight: () =>
            tieneSesion ? (
              <Pressable
                onPress={() => setMenuVisible(true)}
                style={{ marginRight: 15, padding: 5 }}
              >
                <IconSymbol size={26} name="menu" color="#2563EB" />
              </Pressable>
            ) : null,
          headerTitleStyle: { fontWeight: "700" },
        }}
      >
        {/* Definición de las pantallas en el Stack */}
        <Stack.Screen name="fichar" options={{ title: "Fichar" }} />
        <Stack.Screen name="perfil" options={{ title: "Perfil" }} />
        <Stack.Screen name="empresa" options={{ title: "Empresa" }} />
        <Stack.Screen name="horarios" options={{ title: "Horarios" }} />
        <Stack.Screen
          name="fichajes"
          options={{ title: "Registro de Fichajes" }}
        />
        <Stack.Screen name="incidencias" options={{ title: "Incidencias" }} />
        <Stack.Screen
          name="gestion-incidencias"
          options={{ title: "Gestión de Incidencias" }}
        />
        <Stack.Screen name="ausencias" options={{ title: "Ausencias" }} />
        <Stack.Screen
          name="gestion-ausencias"
          options={{ title: "Gestión de Ausencias" }}
        />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>

      {/* Menú Desplegable / Modal superior derecho */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <ThemedText style={styles.menuTitle}>Menú de Navegación</ThemedText>
            {pantallasDisponibles.map((pantalla) => (
              <Pressable
                key={pantalla.name}
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  router.push(`/${pantalla.name}` as any);
                }}
              >
                <IconSymbol
                  size={20}
                  name={pantalla.icon as any}
                  color="#2563EB"
                />
                <ThemedText style={styles.menuItemText}>
                  {pantalla.title}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </AppModalProvider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 15,
  },
  menuContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: 220,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
});
