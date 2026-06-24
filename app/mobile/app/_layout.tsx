// app/mobile/app/_layout.tsx
import { Tabs } from "expo-router";
import { Alert, LogBox, Platform, Pressable } from "react-native"; // 🚀 CORRECCIÓN: Se añadió LogBox en los elementos importados
import {
  ProveedorSesion,
  useSesion,
} from "../src/modules/trabajadores/store/SesionContext";
import { TipoUsuario } from "../src/modules/trabajadores/types/trabajador";
import { ThemedText } from "../src/shared/components/themed-text";
import { IconSymbol } from "../src/shared/ui/icon-symbol";

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

  const TabButtonProtegido = (props: any) => {
    return (
      <Pressable
        {...props}
        onPress={(event) => {
          if (!tieneSesion) {
            Alert.alert(
              "Acceso Restringido",
              "Por favor, introduce tus credenciales corporativas en la pestaña de Acceso para desbloquear esta sección.",
            );
          } else {
            props.onPress?.(event);
          }
        }}
        style={[props.style, { opacity: tieneSesion ? 1 : 0.6 }]}
      />
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
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
          tabBarButton: TabButtonProtegido,
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
          tabBarButton: esAdmin ? TabButtonProtegido : () => null,
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: tieneSesion ? "Mi Perfil" : "Acceso",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={26}
              name={tieneSesion ? "person" : "lock"}
              color={color}
            />
          ),
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
          href: esAdmin ? "/(protected)/empresas" : null,
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
          tabBarButton: TabButtonProtegido,
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
          tabBarButton: TabButtonProtegido,
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
          tabBarButton: TabButtonProtegido,
        }}
      />

      {/* Controladores ocultos de ruteo interno */}
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

export default function TabLayout() {
  return (
    <ProveedorSesion>
      <TabsNavigation />
    </ProveedorSesion>
  );
}
