import { registrarTokenDispositivo } from "@/src/modules/another-services/services";
import { AppModalProvider } from "@/src/shared/ui/AppModalNotification";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  useColorScheme,
  View,
} from "react-native";
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
  const segments = useSegments();
  const router = useRouter();
  const [estaListo, setEstaListo] = useState(false);

  // Inyección de fuentes tipográficas para @expo/vector-icons en Entornos Web
  useEffect(() => {
    if (Platform.OS === "web") {
      const iconFontStyles = `
        @font-face {
          font-family: 'FontAwesome';
          src: url(${require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf")});
        }
        @font-face {
          font-family: 'FontAwesome5_Solid';
          src: url(${require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf")});
        }
        @font-face {
          font-family: 'FontAwesome5_Regular';
          src: url(${require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf")});
        }
        @font-face {
          font-family: 'MaterialIcons';
          src: url(${require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf")});
        }
        @font-face {
          font-family: 'MaterialCommunityIcons';
          src: url(${require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf")});
        }
      `;

      const style = document.createElement("style");
      style.type = "text/css";
      if ((style as any).styleSheet) {
        (style as any).styleSheet.cssText = iconFontStyles;
      } else {
        style.appendChild(document.createTextNode(iconFontStyles));
      }
      document.head.appendChild(style);
    }
  }, []);

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

  // Registrar token push y escuchar notificaciones al iniciar sesión
  useEffect(() => {
    if (!usuarioActual?.id) return;

    registrarTokenDispositivo(usuarioActual.id);

    const subRecibida = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notificación recibida en primer plano:", notification);
      },
    );

    const subRespuesta = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("Usuario presionó la notificación:", data);

        if (data?.type === "OLVIDO_FICHAJE") {
          router.push("/(tabs)/perfil");
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
    if (!estaListo || cargandoSesionLocal) return;

    const enGrupoAutenticacion = segments[0] === "(authentication)";
    const tieneSesion = usuarioActual !== null;
    const segmentLength = (segments as string[]).length;

    if (!tieneSesion && !enGrupoAutenticacion) {
      router.replace("/");
    } else if (tieneSesion && (enGrupoAutenticacion || segmentLength === 0)) {
      router.replace("/(tabs)/perfil");
    }
  }, [usuarioActual, cargandoSesionLocal, estaListo, segments]);

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
  const colorScheme = useColorScheme();
  return (
    <ProveedorSesion>
      <AppModalProvider>
        <InitialLayout />
      </AppModalProvider>
    </ProveedorSesion>
  );
}
