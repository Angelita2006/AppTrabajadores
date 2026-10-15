import { TipoRolEnum } from "@/src/constants/enums";
import { Colors } from "@/src/constants/theme";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { SelectorTema } from "@/src/modules/tema/components/SelectorTema";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { AppModalProvider } from "@/src/shared/ui/AppModalNotification";
import { IconSymbol } from "@/src/shared/ui/IconSymbol";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSesion } from "../../src/modules/usuarios/store/SesionContextZustand";

export default function RootLayout() {
  const { usuarioActual, rolActual, tienePermiso } = useSesion();
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const [menuVisible, setMenuVisible] = useState(false);

  const tieneSesion = usuarioActual !== null;
  const esSuperadministrador =
    rolActual === TipoRolEnum.SUPERADMINISTRADOR ||
    usuarioActual?.tipo_usuario === TipoRolEnum.SUPERADMINISTRADOR;
  const pantallasDisponibles = [
    {
      name: "fichar",
      title: "Fichar",
      show: tieneSesion && tienePermiso("fichajes", "crear"),
      icon: "house.fill",
    },
    { name: "perfil", title: "Perfil", show: tieneSesion, icon: "person" },
    {
      name: "empresa",
      title: "Organizaciones",
      show: tieneSesion && tienePermiso("empresas", "consultar"),
      icon: "briefcase.fill",
    },
    {
      name: "horarios",
      title: "Horarios",
      show: tieneSesion && tienePermiso("asignaciones_turno", "consultar"),
      icon: "schedule",
    },
    {
      name: "fichajes",
      title: "Registro",
      show: tieneSesion && tienePermiso("fichajes", "consultar"),
      icon: "folder",
    },
    {
      name: "incidencias",
      title: "Incidencias",
      show: tieneSesion && tienePermiso("correcciones_fichaje", "crear"),
      icon: "warning",
    },
    {
      name: "gestion-incidencias",
      title: "Gestión Incidencias",
      show: tieneSesion && tienePermiso("correcciones_fichaje", "modificar"),
      icon: "warning",
    },
    {
      name: "ausencias",
      title: "Ausencias",
      show: tieneSesion && tienePermiso("ausencias", "crear"),
      icon: "event",
    },
    {
      name: "gestion-ausencias",
      title: "Gestión Ausencias",
      show: tieneSesion && tienePermiso("ausencias", "modificar"),
      icon: "event",
    },
    {
      name: "licencias",
      title: "Licencias",
      show: tieneSesion && tienePermiso("licencias", "consultar"),
      icon: "key",
    },
    {
      name: "superadministracion",
      title: "Consola de plataforma",
      show: tieneSesion && esSuperadministrador,
      icon: "settings",
    },
  ].filter((pantalla) => pantalla.show);

  return (
    <AppModalProvider>
      <Stack
        screenOptions={{
          headerShown: tieneSesion,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700", color: colors.text },
          headerRight: () =>
            tieneSesion ? (
              <Pressable
                onPress={() => setMenuVisible(true)}
                style={{ marginRight: 15, padding: 5 }}
                accessibilityRole="button"
                accessibilityLabel="Abrir menú de navegación"
              >
                <IconSymbol size={26} name="menu" color={colors.primary} />
              </Pressable>
            ) : null,
        }}
      >
        <Stack.Screen name="fichar" options={{ title: "Fichar" }} />
        <Stack.Screen name="perfil" options={{ title: "Perfil" }} />
        <Stack.Screen name="empresa" options={{ title: "Empresa" }} />
        <Stack.Screen name="licencias" options={{ title: "Licencias" }} />
        <Stack.Screen
          name="superadministracion"
          options={{ title: "Consola de plataforma" }}
        />
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

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={[
              styles.menuContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ThemedText
              style={[
                styles.menuTitle,
                {
                  color: colors.textSecondary,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              Menú de Navegación
            </ThemedText>
            <SelectorTema />
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
                  color={colors.primary}
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
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 15,
  },
  menuContainer: {
    borderRadius: 12,
    borderWidth: 1,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
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
    fontWeight: "500",
  },
});
