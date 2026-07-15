import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  ProveedorSesion,
  useSesion,
} from "../src/modules/trabajadores/store/SesionContext";
import { TipoUsuario } from "../src/modules/trabajadores/types/trabajador";
import { ThemedText } from "../src/shared/components/themed-text";
import { IconSymbol } from "../src/shared/ui/icon-symbol";

function TabsNavigation() {
  const { usuarioActual } = useSesion();
  const [estaListo, setEstaListo] = useState(false);

  // Escudo de tiempo: Damos 300ms para que el almacenamiento nativo del móvil
  // devuelva los datos del usuario antes de que Expo Router calcule los href locales.
  useEffect(() => {
    const timer = setTimeout(() => {
      setEstaListo(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [usuarioActual]);

  // Si el dispositivo físico sigue leyendo los datos de sesión, mostramos un cargando nativo
  if (!estaListo) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const tieneSesion = usuarioActual !== null;

  // Escudo de control horario: Evaluamos si el perfil cuenta con rango directivo
  const esAdmin =
    usuarioActual?.tipo_usuario === ("Admin_empresa" as TipoUsuario) ||
    usuarioActual?.tipo_usuario === ("Admin_gestoría" as TipoUsuario);

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
        options={{
          title: "Fichar",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
          href: tieneSesion ? (!esAdmin ? "/(protected)/home" : null) : null,
        }}
      />

      <Tabs.Screen
        name="(protected)/plantilla"
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
        options={{
          title: "Empresa",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="briefcase.fill" color={color} />
          ),
          href: tieneSesion ? (esAdmin ? "/(protected)/empresas" : null) : null,
        }}
      />

      <Tabs.Screen
        name="(protected)/horarios"
        options={{
          title: "Horarios",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="schedule" color={color} />
          ),
          href: tieneSesion
            ? !esAdmin
              ? "/(protected)/horarios"
              : null
            : null,
        }}
      />

      <Tabs.Screen
        name="(protected)/vacaciones"
        options={{
          title: "Vacaciones",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="event" color={color} />
          ),
          href: tieneSesion
            ? !esAdmin
              ? "/(protected)/vacaciones"
              : null
            : null,
        }}
      />

      <Tabs.Screen
        name="(protected)/aprobar-vacaciones"
        options={{
          title: "Vacaciones",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="event" color={color} />
          ),
          href: tieneSesion
            ? esAdmin
              ? "/(protected)/aprobar-vacaciones"
              : null
            : null,
        }}
      />

      <Tabs.Screen
        name="(protected)/incidencias"
        options={{
          title: "Incidencias",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="warning" color={color} />
          ),
          href: tieneSesion
            ? !esAdmin
              ? "/(protected)/incidencias"
              : null
            : null,
        }}
      />

      <Tabs.Screen
        name="(protected)/fichajes"
        options={{
          title: "Registro",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="schedule" color={color} />
          ),
          href: tieneSesion ? (esAdmin ? "/(protected)/fichajes" : null) : null,
        }}
      />

      <Tabs.Screen
        name="(protected)/resolver-incidencias"
        options={{
          title: "Incidencias",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="warning" color={color} />
          ),
          href: tieneSesion
            ? esAdmin
              ? "/(protected)/resolver-incidencias"
              : null
            : null,
        }}
      />

      {/* Controladores ocultos de ruteo interno */}
      <Tabs.Screen name="(authentication)/registro" options={{ href: null }} />
      <Tabs.Screen
        name="(authentication)/registro-organizacion"
        options={{ href: null }}
      />
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
