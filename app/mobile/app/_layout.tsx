import { Tabs } from "expo-router";
import { Alert, Platform, Pressable } from "react-native";
import {
  ProveedorTrabajador,
  useTrabajador,
} from "../src/modules/trabajadores/store/TrabajadorContext";
import { TipoUsuario } from "../src/modules/trabajadores/types/trabajador";
import { ThemedText } from "../src/shared/components/themed-text";
import { IconSymbol } from "../src/shared/ui/icon-symbol";

/**
 * 1. COMPONENTE INTERNO: Contiene la estructura real y reactiva de las pestañas.
 */
function TabsNavigation() {
  // LÓGICA DE NEGOCIO ACTUALIZADA: Vigilamos la cuenta centralizada del Saas
  const { usuarioActual } = useTrabajador();
  const tieneSesion = usuarioActual !== null;

  // Evaluamos de forma estricta el nivel de privilegios del usuario conectado
  const esAdmin =
    usuarioActual?.tipo_usuario === ("admin_empresa" as TipoUsuario) ||
    usuarioActual?.tipo_usuario === ("admin_gestoria" as TipoUsuario);

  /**
   * Componente de botón personalizado para la barra de pestañas.
   * Lanza un aviso controlado si el usuario intenta saltar al panel sin autenticarse.
   */
  const TabButtonProtegido = (props: any) => {
    return (
      <Pressable
        {...props}
        onPress={(event) => {
          if (!tieneSesion) {
            Alert.alert(
              "Acceso Restringido",
              "Por favor, introduce tus credenciales corporativas en la pestaña de Acceso para desbloquear esta función.",
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
          backgroundColor: "rgba(255, 255, 255, 0.96)",
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
        headerShown: false, // Oculta la barra superior por defecto para ganar espacio en la UI
      }}
    >
      {/* PESTAÑA: Panel de control horario del empleado */}
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

      {/* PESTAÑA PROTEGIDA POR PRIVACIDAD (RGPD): Ocultación total si es un operario común */}
      <Tabs.Screen
        name="(protected)/trabajadores"
        redirect={Platform.OS === "web" ? false : !tieneSesion}
        options={{
          title: "Plantilla",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="group" color={color} />
          ),
          // Si NO es administrador, pasamos 'null' para que Expo Router destruya el botón de la barra
          href: esAdmin ? "/(protected)/trabajadores" : null,
        }}
      />

      {/* PESTAÑA DE ACCESO RECONECTADA: Cambia su nombre dinámicamente según la sesión */}
      <Tabs.Screen
        name="index"
        options={{
          title: tieneSesion ? "Mi Perfil" : "Login",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person" color={color} />
          ),
        }}
      />

      {/* PESTAÑA PROTEGIDA POR PRIVACIDAD: Ocultación total de empresas ajenas */}
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

      {/* PESTAÑA: Planificación de turnos */}
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

      {/* PESTAÑA: Solicitudes de Vacaciones y Ausencias */}
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

      {/* PESTAÑA: Control de Incidencias u Olvidos */}
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

      {/* RUTAS OCULTAS DEL SISTEMA (DEEP LINKS / CONTROL DE DIRECCIONES) */}
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
 * 2. COMPONENTE PRINCIPAL (EXPORT DEFAULT)
 */
export default function TabLayout() {
  return (
    <ProveedorTrabajador>
      <TabsNavigation />
    </ProveedorTrabajador>
  );
}
