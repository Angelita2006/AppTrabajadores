import { Tabs } from "expo-router";
import { LogBox, Platform } from "react-native";

import {
  ProveedorSesion,
  useSesion,
} from "../src/modules/trabajadores/store/SesionContext";
import { TipoUsuario } from "../src/modules/trabajadores/types/trabajador";
import { ThemedText } from "../src/shared/components/themed-text";
import { IconSymbol } from "../src/shared/ui/icon-symbol";
// Silencia este aviso específico en el entorno de desarrollo web/móvil
LogBox.ignoreLogs(['props.pointerEvents is deprecated']);

// Desactivamos las alertas visuales solo si la aplicación se ejecuta en navegadores.
// Esto evita que el bug interno del LogContext de Expo rompa el árbol de renderizado de la web.
if (Platform.OS === "web") {
  LogBox.ignoreAllLogs(true);
}

function TabsNavigation() {
  const { usuarioActual } = useSesion();
  const tieneSesion = usuarioActual !== null;

  // Escudo de control horario: Evaluamos si el perfil cuenta con rango directivo
  const esAdmin =
    usuarioActual?.tipo_usuario === ("admin_empresa" as TipoUsuario) ||
    usuarioActual?.tipo_usuario === ("admin_gestoria" as TipoUsuario);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          display: tieneSesion ? "flex" : "none",
          height: 90,
          paddingTop: 10,
          paddingBottom: 14,
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
              color: color,
              marginTop: 4,
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
        name="(protected)/home"
        redirect={Platform.OS === "web" ? false : !tieneSesion}
        options={{
          title: "Fichar",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
          href: tieneSesion ? "/(protected)/home" : null,
        }}
      />

      <Tabs.Screen
        name="(protected)/plantilla"
        redirect={Platform.OS === "web" ? false : !tieneSesion}
        options={{
          title: "Plantilla",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="group" color={color} />
          ),
          href: esAdmin ? "/(protected)/plantilla" : null,
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: tieneSesion ? "Perfil" : "Login",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person" color={color} />
          ),
          href: !tieneSesion ? null : "/",
        }}
      />

      <Tabs.Screen
        name="(protected)/empresas"
        redirect={Platform.OS === "web" ? false : !tieneSesion}
        options={{
          title: "Empresas",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="briefcase.fill" color={color} />
          ),
          href: tieneSesion ? (esAdmin ? "/(protected)/empresas" : null) : null,
        }}
      />

      <Tabs.Screen
        name="(protected)/horarios"
        redirect={Platform.OS === "web" ? false : !tieneSesion}
        options={{
          title: "Horarios",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="schedule" color={color} />
          ),
          href: tieneSesion ? "/(protected)/horarios" : null,
        }}
      />

      <Tabs.Screen
        name="(protected)/vacaciones"
        redirect={Platform.OS === "web" ? false : !tieneSesion}
        options={{
          title: "Vacaciones",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="event" color={color} />
          ),
          href: tieneSesion ? "/(protected)/vacaciones" : null,
        }}
      />

      <Tabs.Screen
        name="(protected)/incidencias"
        redirect={Platform.OS === "web" ? false : !tieneSesion}
        options={{
          title: "Incidencias",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="warning" color={color} />
          ),
          href: tieneSesion ? "/(protected)/incidencias" : null,
        }}
      />

      <Tabs.Screen
        name="(protected)/trabajadores"
        redirect={Platform.OS === "web" ? false : !tieneSesion}
        options={{
          title: "Trabajadores",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person" color={color} />
          ),
          href: tieneSesion ? (esAdmin ? "/(protected)/empresas" : null) : null,
        }}
      />

      {/* Controladores ocultos de ruteo interno */}
      <Tabs.Screen name="(protected)/fichajes" options={{ href: null }} />
      {/* <Tabs.Screen name="(protected)/perfil" options={{ href: null }} /> */}
      {/* <Tabs.Screen name="(authentication)/login" options={{ href: null }} /> */}
      <Tabs.Screen name="(authentication)/registro" options={{ href: null }} />
      <Tabs.Screen
        name="(authentication)/recuperar-password"
        options={{ href: null }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <ProveedorSesion>
      <TabsNavigation />
    </ProveedorSesion>
  );
}
