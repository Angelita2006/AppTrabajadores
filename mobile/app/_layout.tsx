import { registrarTokenDispositivo } from "@/src/modules/another-services/services";
import {
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications"; // <--- Importante
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  ProveedorSesion,
  useSesion,
} from "../src/modules/usuarios/store/SesionContext";

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

  // --- EFECTO NUEVO: Registrar token push y escuchar notificaciones al iniciar sesión ---
  useEffect(() => {
    if (!usuarioActual?.id) return;

    // 1. Registramos el token FCM / Expo en tu backend de FastAPI apenas se detecta sesión
    registrarTokenDispositivo(usuarioActual.id);

    // 2. Escuchar cuando llega una notificación con la app abierta
    const subRecibida = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notificación recibida en primer plano:", notification);
      },
    );

    // 3. Escuchar cuando el usuario hace clic en la notificación de olvido de fichaje
    const subRespuesta = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("Usuario presionó la notificación:", data);

        if (data?.type === "OLVIDO_FICHAJE") {
          // Redirige al usuario a la pantalla correspondiente dentro de tus tabs
          router.push("/(tabs)/perfil"); // O la ruta específica de fichajes si la tienes
        }
      },
    );

    return () => {
      subRecibida.remove();
      subRespuesta.remove();
    };
  }, [usuarioActual]);

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
