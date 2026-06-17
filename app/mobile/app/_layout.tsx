import { Tabs } from "expo-router";
import { Alert, Platform, Pressable } from "react-native";
import {
  ProveedorTrabajador,
  useTrabajador,
} from "../src/modules/trabajadores/store/TrabajadorContext";
import { ThemedText } from "../src/shared/components/themed-text";
import { IconSymbol } from "../src/shared/ui/icon-symbol";

/**
 * 1. COMPONENTE INTERNO: Contiene la estructura real de las pestañas.
 * Al estar metido dentro del Proveedor, aquí SÍ funciona useTrabajador sin errores.
 */
function TabsNavigation() {
  // Extraemos el trabajador actual para verificar si hay una sesión activa
  const { trabajadorActual } = useTrabajador();
  const tieneSesion = trabajadorActual !== null;

  /**
   * Componente de botón personalizado para la barra de pestañas.
   * Modifica la opacidad visual si no hay sesión y lanza la alerta informativa.
   */
  const TabButtonProtegido = (props: any) => {
    return (
      <Pressable
        {...props}
        onPress={(event) => {
          if (!tieneSesion) {
            // Lanza el aviso pero no cambia de pantalla gracias al redirect de abajo
            Alert.alert(
              "Acceso restringido",
              "Por favor, inicia sesión en la pestaña de Perfil para acceder a esta función.",
            );
          } else {
            props.onPress?.(event);
          }
        }}
        style={[props.style, { opacity: tieneSesion ? 1 : 0.7 }]}
      />
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          height: 100,
          paddingTop: 10,
          paddingBottom: 14,
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
        },
        tabBarLabel: ({ children, color }) => (
          <ThemedText
            numberOfLines={1}
            style={{
              fontSize: 8.3,
              textAlign: "center",
              color: color,
              marginTop: 4,
            }}
          >
            {children}
          </ThemedText>
        ),
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#64748B",
      }}
    >
      <Tabs.Screen
        name="(protected)/home"
        redirect={Platform.OS === "web" ? false : !tieneSesion} // <-- En la web se salta el bloqueo inicial
        options={{
          title: "Fichar",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
          tabBarButton: TabButtonProtegido,
        }}
      />

      <Tabs.Screen
        name="(protected)/trabajadores"
        redirect={Platform.OS === "web" ? false : !tieneSesion} // <-- En la web se salta el bloqueo inicial
        options={{
          title: "Trabajadores",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="group" color={color} />
          ),
          tabBarButton: TabButtonProtegido,
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="(protected)/empresas"
        redirect={Platform.OS === "web" ? false : !tieneSesion} // <-- En la web se salta el bloqueo inicial
        options={{
          title: "Empresas",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="briefcase.fill" color={color} />
          ),
          tabBarButton: TabButtonProtegido,
        }}
      />

      <Tabs.Screen
        name="(protected)/horarios"
        redirect={Platform.OS === "web" ? false : !tieneSesion} // <-- En la web se salta el bloqueo inicial
        options={{
          title: "Horarios",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="schedule" color={color} />
          ),
          tabBarButton: TabButtonProtegido,
        }}
      />

      <Tabs.Screen
        name="(protected)/vacaciones"
        redirect={Platform.OS === "web" ? false : !tieneSesion} // <-- En la web se salta el bloqueo inicial
        options={{
          title: "Vacaciones",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="event" color={color} />
          ),
          tabBarButton: TabButtonProtegido,
        }}
      />

      <Tabs.Screen
        name="(protected)/incidencias"
        redirect={Platform.OS === "web" ? false : !tieneSesion} // <-- En la web se salta el bloqueo inicial
        options={{
          title: "Incidencias",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="warning" color={color} />
          ),
          tabBarButton: TabButtonProtegido,
        }}
      />

      <Tabs.Screen name="(protected)/fichajes" options={{ href: null }} />
      <Tabs.Screen name="(protected)/perfil" options={{ href: null }} />
      <Tabs.Screen name="(public)/login" options={{ href: null }} />
      <Tabs.Screen name="(public)/registro" options={{ href: null }} />
      <Tabs.Screen
        name="(public)/recuperar-password"
        options={{ href: null }}
      />
    </Tabs>
  );
}

/**
 * 2. COMPONENTE PRINCIPAL (EXPORT DEFAULT):
 * Enciende primero el Proveedor de datos y luego monta las pestañas de abajo de forma segura.
 */
export default function TabLayout() {
  return (
    <ProveedorTrabajador>
      <TabsNavigation />
    </ProveedorTrabajador>
  );
}
