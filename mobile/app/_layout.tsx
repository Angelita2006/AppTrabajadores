import {
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  ProveedorSesion,
  useSesion,
} from "../src/modules/usuarios/store/SesionContext";

// Evita que la pantalla de inicio del sistema desaparezca antes de tiempo
SplashScreen.preventAutoHideAsync?.();

function InitialLayout() {
  const { usuarioActual, cargandoSesionLocal } = useSesion();
  const segments = useSegments();
  const router = useRouter();
  const [estaListo, setEstaListo] = useState(false);

  // Carga explícita de las fuentes de iconos para que se generen en el dist web
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...FontAwesome.font,
    ...MaterialCommunityIcons.font,
  });

  // Control de sincronización inicial y Splash Screen nativo
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

  // Efecto central de protección de rutas (Guard) antierrores
  useEffect(() => {
    // Evita evaluar redirecciones si el layout general o el contexto aún cargan
    if (!estaListo || cargandoSesionLocal) return;

    const enGrupoAutenticacion = segments[0] === "(authentication)";
    const tieneSesion = usuarioActual !== null;
    const segmentLength = (segments as string[]).length;

    // Caso 1: Usuario sin sesión intentando acceder a rutas protegidas de la app
    if (!tieneSesion && !enGrupoAutenticacion) {
      router.replace("/");
    }
    // Caso 2: Usuario con sesión activa atrapado en el login/registro o raíz pura
    else if (tieneSesion && (enGrupoAutenticacion || segmentLength === 0)) {
      router.replace("/(tabs)/perfil");
    }
  }, [usuarioActual, cargandoSesionLocal, estaListo, segments]);

  // Pantalla de carga robusta mientras se valida la persistencia o el temporizador
  if (!estaListo || cargandoSesionLocal) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0F172A",
        }}
      >
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(authentication)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ProveedorSesion>
      <InitialLayout />
    </ProveedorSesion>
  );
}
