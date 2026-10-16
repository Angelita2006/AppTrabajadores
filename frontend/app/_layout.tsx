import { AppModalProvider } from "@/src/shared/ui/AppModalNotification";
import {
  FontAwesome,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Colors } from "../src/constants/theme";
import { useColorScheme } from "../src/hooks/use-color-scheme";
import { useTemaStore } from "../src/modules/tema/store/temaStore";
import {
  ProveedorSesion,
  useSesion,
} from "../src/modules/usuarios/store/SesionContextZustand";

// Configuración global de comportamiento de notificaciones en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Evita que la pantalla de inicio del sistema desaparezca antes de tiempo
SplashScreen.preventAutoHideAsync?.();

function InitialLayout() {
  const { usuarioActual, cargandoSesionLocal } = useSesion();
  const temaInicializado = useTemaStore((state) => state.inicializado);
  const inicializarTema = useTemaStore((state) => state.inicializarTema);
  const tema = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const [estaListo, setEstaListo] = useState(false);

  useEffect(() => {
    void inicializarTema();
  }, [inicializarTema]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEstaListo(true);
      try {
        SplashScreen.hideAsync?.();
      } catch (e) {
        console.error("Error al ocultar el splash screen:", e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  // Guard de navegación unificado: redirige siempre a perfil al iniciar sesión
  useEffect(() => {
    if (!estaListo || cargandoSesionLocal) return;

    const enGrupoTabs = segments[0] === "(tabs)";
    const tieneSesion = usuarioActual !== null;
    const enFlujoCompra = segments[0] === "planes" || segments[0] === "checkout";

    if (tieneSesion && !enGrupoTabs && !enFlujoCompra) {
      // Todos los usuarios van directamente al perfil tras iniciar sesión
      router.replace("/(tabs)/perfil");
    } else if (!tieneSesion && enGrupoTabs) {
      // Si no hay sesión y está intentando ver las pestañas, lo mandamos al inicio
      router.replace("/");
    }
  }, [usuarioActual, cargandoSesionLocal, estaListo, segments]);

  if (!estaListo || cargandoSesionLocal || !temaInicializado) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors[tema].background,
        }}
      >
        <ActivityIndicator size="large" color={Colors[tema].primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="politica-privacidad"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="confirmar-cambio-email"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="planes" options={{ headerShown: false }} />
      <Stack.Screen name="(authentication)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const tema = useColorScheme();
  // Carga explícita de mapas de iconos para entornos Web y Móvil
  const [fuentesCargadas, errorFuentes] = useFonts({
    ...FontAwesome.font,
    ...FontAwesome5.font,
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
    ...Ionicons.font,
  });

  if (!fuentesCargadas && !errorFuentes) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors[tema].background,
        }}
      >
        <ActivityIndicator size="large" color={Colors[tema].primary} />
      </View>
    );
  }

  return (
    <ProveedorSesion>
      <AppModalProvider>
        <ThemeProvider value={tema === "dark" ? DarkTheme : DefaultTheme}>
          <StatusBar
            style={tema === "dark" ? "light" : "dark"}
            backgroundColor={Colors[tema].background}
          />
          <InitialLayout />
        </ThemeProvider>
      </AppModalProvider>
    </ProveedorSesion>
  );
}
