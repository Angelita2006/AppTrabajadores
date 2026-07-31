import { TipoUsuarioEnum } from "@/src/modules/usuarios/types/usuario";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSesion } from "../../src/modules/usuarios/store/SesionContext";
import { ThemedText } from "../../src/shared/components/themed-text";
import { IconSymbol } from "../../src/shared/ui/icon-symbol";

export default function TabsLayout() {
  const { usuarioActual } = useSesion();
  const insets = useSafeAreaInsets();

  const tieneSesion = usuarioActual !== null;
  const esAdmin =
    usuarioActual?.tipo_usuario === TipoUsuarioEnum.ADMIN_EMPRESA ||
    usuarioActual?.tipo_usuario === TipoUsuarioEnum.ADMIN_GESTORIA;

  const bottomInset = insets.bottom > 0 ? insets.bottom : 10;
  const tabBarHeight = 65 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          display: tieneSesion ? "flex" : "none",
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: bottomInset,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
        },
        tabBarLabel: ({ children, color }) => (
          <ThemedText
            numberOfLines={1}
            style={{
              fontSize: 9,
              textAlign: "center",
              color,
              marginTop: 2,
              fontWeight: "700",
            }}
          >
            {children}
          </ThemedText>
        ),
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#64748B",
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Fichar",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
          href: tieneSesion ? (!esAdmin ? "/home" : null) : null,
        }}
      />
      <Tabs.Screen
        name="plantilla"
        options={{
          title: "Plantilla",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="group" color={color} />
          ),
          href: esAdmin ? "/plantilla" : null,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: tieneSesion ? "Perfil" : "Login",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="person" color={color} />
          ),
          href: !tieneSesion ? null : "/perfil",
        }}
      />
      <Tabs.Screen
        name="empresas"
        options={{
          title: "Empresa",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="briefcase.fill" color={color} />
          ),
          href: tieneSesion ? (esAdmin ? "/empresas" : null) : null,
        }}
      />
      <Tabs.Screen
        name="horarios"
        options={{
          title: "Horarios",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="schedule" color={color} />
          ),
          href: tieneSesion ? (!esAdmin ? "/horarios" : null) : null,
        }}
      />
      <Tabs.Screen
        name="vacaciones"
        options={{
          title: "Vacaciones",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="event" color={color} />
          ),
          href: tieneSesion ? (!esAdmin ? "/vacaciones" : null) : null,
        }}
      />
      <Tabs.Screen
        name="aprobar-vacaciones"
        options={{
          title: "Vacaciones",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="event" color={color} />
          ),
          href: tieneSesion ? (esAdmin ? "/aprobar-vacaciones" : null) : null,
        }}
      />
      <Tabs.Screen
        name="incidencias"
        options={{
          title: "Incidencias",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="warning" color={color} />
          ),
          href: tieneSesion ? (!esAdmin ? "/incidencias" : null) : null,
        }}
      />
      <Tabs.Screen
        name="fichajes"
        options={{
          title: "Registro",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="schedule" color={color} />
          ),
          href: tieneSesion ? (esAdmin ? "/fichajes" : null) : null,
        }}
      />
      <Tabs.Screen
        name="resolver-incidencias"
        options={{
          title: "Incidencias",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="warning" color={color} />
          ),
          href: tieneSesion ? (esAdmin ? "/resolver-incidencias" : null) : null,
        }}
      />
    </Tabs>
  );
}
